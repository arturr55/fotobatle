import { Router, Response } from 'express'
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth'
import prisma from '../db'

const router = Router()

router.use(authMiddleware)

// Request withdrawal
router.post('/withdraw', async (req: AuthRequest, res: Response) => {
  const { amount } = req.body

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Minimum withdrawal is 100 coins' })
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
        select: { id: true, telegramId: true, username: true, firstName: true }
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
