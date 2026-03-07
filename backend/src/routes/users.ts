import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import prisma from '../db'

const router = Router()

router.use(authMiddleware)

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      telegramId: true,
      username: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      balance: true,
      totalWins: true,
      totalEarned: true,
      bonusVotes: true,
      createdAt: true,
      _count: { select: { referrals: true } }
    }
  })
  res.json({ ...user, telegramId: user?.telegramId?.toString(), isAdmin: req.user!.isAdmin, referralCount: user?._count?.referrals ?? 0 })
})

// Claim referral bonus (called when new user opens app via referral link)
router.post('/claim-referral', async (req: AuthRequest, res: Response) => {
  const { referrerId } = req.body
  if (!referrerId || typeof referrerId !== 'number') return res.status(400).json({ error: 'Invalid referrerId' })

  const currentUserId = req.user!.id
  if (referrerId === currentUserId) return res.status(400).json({ error: 'Cannot refer yourself' })

  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { referredBy: true } })
  if (currentUser?.referredBy) return res.status(400).json({ error: 'Already referred' })

  const referrer = await prisma.user.findUnique({ where: { id: referrerId } })
  if (!referrer) return res.status(404).json({ error: 'Referrer not found' })

  await prisma.$transaction([
    prisma.user.update({ where: { id: currentUserId }, data: { referredBy: referrerId } }),
    prisma.user.update({ where: { id: referrerId }, data: { bonusVotes: { increment: 2 } } }),
  ])

  res.json({ success: true })
})

router.get('/me/transactions', async (req: AuthRequest, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(transactions)
})

router.get('/me/entries', async (req: AuthRequest, res: Response) => {
  const entries = await prisma.battleEntry.findMany({
    where: { userId: req.user!.id },
    include: {
      battle: {
        select: { id: true, title: true, category: true, status: true, endsAt: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  res.json(entries)
})

export default router
