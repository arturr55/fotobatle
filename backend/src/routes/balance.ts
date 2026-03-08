import { Router, Response, Request } from 'express'
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth'
import prisma from '../db'

const router = Router()

// Bot deposit endpoint (no auth middleware - uses shared secret)
router.post('/deposit', async (req: Request, res: Response) => {
  if (req.headers['x-bot-secret'] !== process.env.BOT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const { userId, coins, telegramChargeId } = req.body
  if (!userId || !coins) return res.status(400).json({ error: 'Missing fields' })

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: coins } }
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: coins,
        description: 'Пополнение Батл Старс через Telegram Stars',
        metadata: { telegramChargeId }
      }
    })
  ])
  res.json({ success: true })
})

router.use(authMiddleware)

// Create Telegram Stars invoice link
router.post('/create-invoice', async (req: AuthRequest, res: Response) => {
  const BOT_TOKEN = process.env.BOT_TOKEN
  if (!BOT_TOKEN) return res.status(500).json({ error: 'Not configured' })

  const { stars } = req.body
  const valid = [5, 10, 25, 50, 100]
  if (!valid.includes(stars)) return res.status(400).json({ error: 'Invalid package' })

  const coins = stars
  const payload = `${req.user!.id}:${coins}`

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${coins} Батл Старс`,
      description: `Пополнение баланса ФотоБатл: ${coins} Батл Старс`,
      payload,
      currency: 'XTR',
      prices: [{ label: `${coins} Батл Старс`, amount: stars }],
    })
  })

  const data = await response.json() as { ok: boolean; result: string }
  if (!data.ok) return res.status(500).json({ error: 'Failed to create invoice' })

  res.json({ url: data.result })
})

// Request withdrawal
router.post('/withdraw', async (req: AuthRequest, res: Response) => {
  const { amount } = req.body

  if (!amount || amount < 10) {
    return res.status(400).json({ error: 'Minimum withdrawal is 10 Батл Старс' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user || user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  const pending = await prisma.withdrawalRequest.findFirst({
    where: { userId: req.user!.id, status: 'PENDING' }
  })
  if (pending) {
    return res.status(400).json({ error: 'You already have a pending withdrawal request' })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.id },
      data: { balance: { decrement: amount } }
    }),
    prisma.withdrawalRequest.create({
      data: { userId: req.user!.id, amount }
    }),
    prisma.transaction.create({
      data: {
        userId: req.user!.id,
        type: 'WITHDRAWAL',
        amount: -amount,
        description: 'Withdrawal request'
      }
    })
  ])

  res.json({ success: true, message: 'Withdrawal request created. Processing within 24-48h.' })
})

// Get my withdrawal requests
router.get('/withdrawals', async (req: AuthRequest, res: Response) => {
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
  res.json(withdrawals)
})

// Admin: get all pending withdrawals
router.get('/admin/withdrawals', adminOnly, async (req: AuthRequest, res: Response) => {
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        select: { id: true, username: true, firstName: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
  res.json(withdrawals)
})

// Admin: process withdrawal
router.patch('/admin/withdrawals/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)
  const { status, adminNote } = req.body

  if (!['PAID', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } })
  if (!withdrawal) return res.status(404).json({ error: 'Not found' })
  if (withdrawal.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' })

  if (status === 'REJECTED') {
    await prisma.$transaction([
      prisma.withdrawalRequest.update({
        where: { id },
        data: { status, adminNote, processedAt: new Date() }
      }),
      prisma.user.update({
        where: { id: withdrawal.userId },
        data: { balance: { increment: withdrawal.amount } }
      }),
      prisma.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'REFUND',
          amount: withdrawal.amount,
          description: 'Withdrawal rejected - funds returned',
          metadata: { withdrawalId: id, reason: adminNote }
        }
      })
    ])
  } else {
    await prisma.withdrawalRequest.update({
      where: { id },
      data: { status, adminNote, processedAt: new Date() }
    })
  }

  res.json({ success: true })
})

export default router
