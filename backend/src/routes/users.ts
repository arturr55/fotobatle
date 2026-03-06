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
      createdAt: true,
    }
  })
  res.json({ ...user, telegramId: user?.telegramId?.toString(), isAdmin: req.user!.isAdmin })
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
