import { Router, Response } from 'express'
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth'
import prisma from '../db'
import { finishBattle } from '../services/battleService'

const router = Router()

router.use(authMiddleware)

// Get all active/upcoming battles
router.get('/', async (req: AuthRequest, res: Response) => {
  const battles = await prisma.battle.findMany({
    where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
    include: {
      _count: { select: { entries: true } }
    },
    orderBy: { startsAt: 'asc' }
  })
  res.json(battles)
})

// Get finished battles with top-3 winners
router.get('/finished', async (req: AuthRequest, res: Response) => {
  const battles = await prisma.battle.findMany({
    where: { status: 'FINISHED' },
    orderBy: { endsAt: 'desc' },
    take: 20,
    include: {
      entries: {
        where: { rank: { in: [1, 2, 3] } },
        orderBy: { rank: 'asc' },
        include: {
          user: { select: { id: true, username: true, firstName: true, avatarUrl: true } }
        }
      }
    }
  })
  res.json(battles)
})

// Resolve entry to battle (for deep links)
router.get('/entries/:entryId', async (req: AuthRequest, res: Response) => {
  const entryId = parseInt(req.params.entryId as string)
  const entry = await prisma.battleEntry.findUnique({
    where: { id: entryId },
    select: { battleId: true }
  })
  if (!entry) return res.status(404).json({ error: 'Entry not found' })
  res.json({ battleId: entry.battleId })
})

// Get single battle with top entries
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)

  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      _count: { select: { entries: true } },
      entries: {
        orderBy: { score: 'desc' },
        take: 50,
        include: {
          user: {
            select: { id: true, username: true, firstName: true, avatarUrl: true }
          }
        }
      }
    }
  })

  if (!battle) return res.status(404).json({ error: 'Battle not found' })
  res.json(battle)
})

// Get random entry to vote on
router.get('/:id/vote-entry', async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)

  const alreadyVoted = await prisma.vote.findMany({
    where: {
      userId: req.user!.id,
      entry: { battleId }
    },
    select: { entryId: true }
  })

  const votedIds = alreadyVoted.map(v => v.entryId)

  const entry = await prisma.battleEntry.findFirst({
    where: {
      battleId,
      userId: { not: req.user!.id },
      id: { notIn: votedIds.length > 0 ? votedIds : undefined }
    },
    include: {
      user: {
        select: { id: true, username: true, firstName: true, avatarUrl: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (!entry) return res.json(null)
  res.json(entry)
})

// Vote on entry
router.post('/entries/:entryId/vote', async (req: AuthRequest, res: Response) => {
  const entryId = parseInt(req.params.entryId as string)
  const { reaction } = req.body

  const reactionPoints: Record<string, number> = {
    heart: 1,
    fire: 3,
    wow: 2,
    clap: 1,
  }

  const points = reactionPoints[reaction]
  if (!points) return res.status(400).json({ error: 'Invalid reaction' })

  const entry = await prisma.battleEntry.findUnique({
    where: { id: entryId },
    include: { battle: true }
  })

  if (!entry) return res.status(404).json({ error: 'Entry not found' })
  if (entry.userId === req.user!.id) return res.status(400).json({ error: 'Cannot vote for yourself' })
  if (entry.battle.status !== 'ACTIVE') return res.status(400).json({ error: 'Battle not active' })

  const existing = await prisma.vote.findUnique({
    where: { entryId_userId: { entryId, userId: req.user!.id } }
  })
  if (existing) return res.status(400).json({ error: 'Already voted' })

  await prisma.$transaction([
    prisma.vote.create({
      data: { entryId, userId: req.user!.id, reaction, points }
    }),
    prisma.battleEntry.update({
      where: { id: entryId },
      data: { score: { increment: points } }
    })
  ])

  res.json({ success: true, points })
})

// Enter battle (upload photo as base64)
router.post('/:id/enter', async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)

  const battle = await prisma.battle.findUnique({ where: { id: battleId } })
  if (!battle) return res.status(404).json({ error: 'Battle not found' })
  if (battle.status !== 'UPCOMING') return res.status(400).json({ error: 'Registration is closed' })

  const existing = await prisma.battleEntry.findUnique({
    where: { battleId_userId: { battleId, userId: req.user!.id } }
  })
  if (existing) return res.status(400).json({ error: 'Already entered this battle' })

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user || user.balance < battle.entryFee) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  const { photo } = req.body
  if (!photo || !photo.startsWith('data:image')) return res.status(400).json({ error: 'Photo required' })
  if (photo.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'Photo too large (max 3MB)' })

  const photoUrl = photo

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.id },
      data: { balance: { decrement: battle.entryFee } }
    }),
    prisma.battle.update({
      where: { id: battleId },
      data: { prizePool: { increment: battle.entryFee } }
    }),
    prisma.battleEntry.create({
      data: { battleId, userId: req.user!.id, photoUrl }
    }),
    prisma.transaction.create({
      data: {
        userId: req.user!.id,
        type: 'ENTRY_FEE',
        amount: -battle.entryFee,
        description: `Entry fee for "${battle.title}"`,
        metadata: { battleId }
      }
    })
  ])

  res.json({ success: true })
})

// Leave battle (refund if no votes on entry)
router.delete('/:id/entry', async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)

  const entry = await prisma.battleEntry.findUnique({
    where: { battleId_userId: { battleId, userId: req.user!.id } },
    include: { _count: { select: { votes: true } } }
  })

  if (!entry) return res.status(404).json({ error: 'You are not in this battle' })

  const battle = await prisma.battle.findUnique({ where: { id: battleId } })
  if (!battle) return res.status(404).json({ error: 'Battle not found' })
  if (battle.status === 'FINISHED') return res.status(400).json({ error: 'Battle already finished' })

  if (entry._count.votes > 0) {
    return res.status(400).json({ error: 'Cannot leave after receiving votes' })
  }

  await prisma.$transaction([
    prisma.battleEntry.delete({ where: { id: entry.id } }),
    prisma.battle.update({
      where: { id: battleId },
      data: { prizePool: { decrement: battle.entryFee } }
    }),
    prisma.user.update({
      where: { id: req.user!.id },
      data: { balance: { increment: battle.entryFee } }
    }),
    prisma.transaction.create({
      data: {
        userId: req.user!.id,
        type: 'REFUND',
        amount: battle.entryFee,
        description: `Выход из батла "${battle.title}"`,
        metadata: { battleId }
      }
    })
  ])

  res.json({ success: true })
})

// Admin: create battle
router.post('/', adminOnly, async (req: AuthRequest, res: Response) => {
  const { title, description, category, entryFee, startsAt, endsAt } = req.body

  const battle = await prisma.battle.create({
    data: {
      title,
      description,
      category,
      entryFee: entryFee || 50,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    }
  })

  res.json(battle)
})

// Admin: finish battle manually
router.post('/:id/finish', adminOnly, async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)
  await finishBattle(battleId)
  res.json({ success: true })
})

export default router
