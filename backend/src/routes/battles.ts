import { Router, Response } from 'express'
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth'
import prisma from '../db'
import { finishBattle } from '../services/battleService'
import { checkAchievements } from '../services/achievementService'
import { sendNotification } from '../services/notifyService'

const router = Router()
router.use(authMiddleware)

const BOT_TOKEN = process.env.BOT_TOKEN || ''

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
      },
      battleChannels: {
        orderBy: { order: 'asc' },
        include: { promotion: { select: { id: true, channelUsername: true, targetSubscribers: true, subscribedCount: true, status: true } } }
      }
    }
  })

  if (!battle) return res.status(404).json({ error: 'Battle not found' })

  // Find current active required channel
  const currentChannel = battle.battleChannels.find(bc =>
    bc.promotion.status === 'ACTIVE' && bc.promotion.subscribedCount < bc.promotion.targetSubscribers
  )

  res.json({ ...battle, requiredChannel: currentChannel?.promotion || null })
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

  if (existing) {
    // Allow re-vote only with bonus votes
    const voter = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { bonusVotes: true } })
    if (!voter || voter.bonusVotes <= 0) return res.status(400).json({ error: 'Already voted' })

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { bonusVotes: { decrement: 1 } } }),
      prisma.battleEntry.update({
        where: { id: entryId },
        data: { score: { increment: points } }
      })
    ])
    return res.json({ success: true, points, bonusUsed: true })
  }

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

  // Check channel subscription requirement
  const battleChannels = await prisma.battleChannel.findMany({
    where: { battleId },
    include: { promotion: true },
    orderBy: { order: 'asc' }
  })
  const currentChannel = battleChannels.find(bc =>
    bc.promotion.status === 'ACTIVE' && bc.promotion.subscribedCount < bc.promotion.targetSubscribers
  )
  if (currentChannel) {
    const fullUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { telegramId: true } })
    if (fullUser && BOT_TOKEN) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: `@${currentChannel.promotion.channelUsername}`, user_id: fullUser.telegramId.toString() })
        })
        const data = await r.json() as any
        const status = data.result?.status
        if (!['member', 'administrator', 'creator'].includes(status)) {
          return res.status(400).json({ error: 'NOT_SUBSCRIBED', channel: currentChannel.promotion.channelUsername })
        }
      } catch {
        return res.status(400).json({ error: 'SUBSCRIPTION_CHECK_FAILED', channel: currentChannel.promotion.channelUsername })
      }
    }

    // Record subscription (if not already done)
    const alreadySub = await prisma.channelSubscription.findUnique({
      where: { userId_promotionId: { userId: req.user!.id, promotionId: currentChannel.promotionId } }
    })
    if (!alreadySub) {
      await prisma.$transaction([
        prisma.channelSubscription.create({ data: { userId: req.user!.id, promotionId: currentChannel.promotionId } }),
        prisma.channelPromotion.update({ where: { id: currentChannel.promotionId }, data: { subscribedCount: { increment: 1 } } })
      ])
      // Check if promotion is now complete
      const updated = await prisma.channelPromotion.findUnique({ where: { id: currentChannel.promotionId } })
      if (updated && updated.subscribedCount >= updated.targetSubscribers) {
        await prisma.channelPromotion.update({ where: { id: currentChannel.promotionId }, data: { status: 'COMPLETED' } })
        const owner = await prisma.user.findUnique({ where: { id: updated.ownerId }, select: { telegramId: true } })
        if (owner) {
          await sendNotification(owner.telegramId, `🎉 Ваш канал @${updated.channelUsername} набрал ${updated.targetSubscribers} подписчиков! Продвижение завершено.`)
        }
      }
    }
  }

  const { photo } = req.body
  if (!photo || !photo.startsWith('data:image')) return res.status(400).json({ error: 'Photo required' })
  if (photo.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'Photo too large (max 3MB)' })

  const photoUrl = photo

  const txOps: any[] = [
    prisma.battleEntry.create({ data: { battleId, userId: req.user!.id, photoUrl } }),
  ]

  if (battle.entryFee > 0) {
    txOps.push(
      prisma.user.update({ where: { id: req.user!.id }, data: { balance: { decrement: battle.entryFee } } }),
      prisma.battle.update({ where: { id: battleId }, data: { prizePool: { increment: battle.entryFee } } }),
      prisma.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'ENTRY_FEE',
          amount: -battle.entryFee,
          description: `Взнос за батл "${battle.title}"`,
          metadata: { battleId }
        }
      })
    )
  }

  await prisma.$transaction(txOps)

  // Check achievements after entering
  const newAchievements = await checkAchievements(req.user!.id)
  res.json({ success: true, achievements: newAchievements })
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

  const leaveOps: any[] = [
    prisma.battleEntry.delete({ where: { id: entry.id } }),
  ]

  if (battle.entryFee > 0) {
    leaveOps.push(
      prisma.battle.update({ where: { id: battleId }, data: { prizePool: { decrement: battle.entryFee } } }),
      prisma.user.update({ where: { id: req.user!.id }, data: { balance: { increment: battle.entryFee } } }),
      prisma.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'REFUND',
          amount: battle.entryFee,
          description: `Выход из батла "${battle.title}"`,
          metadata: { battleId }
        }
      })
    )
  }

  await prisma.$transaction(leaveOps)

  res.json({ success: true })
})

// Admin: create battle
router.post('/', adminOnly, async (req: AuthRequest, res: Response) => {
  const { title, description, category, entryFee, minParticipants, startsAt, endsAt, prizeType, prizeConfig, sponsorPool, channelQueue } = req.body

  const battle = await prisma.battle.create({
    data: {
      title,
      description,
      category,
      entryFee: entryFee ?? 5,
      minParticipants: minParticipants ?? 2,
      prizeType: prizeType || 'POOL_PERCENT',
      prizeConfig: prizeConfig || [],
      sponsorPool: sponsorPool || 0,
      prizePool: sponsorPool || 0,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    }
  })

  // Attach channel queue if provided (array of promotionIds in order)
  if (channelQueue && Array.isArray(channelQueue) && channelQueue.length > 0) {
    await prisma.battleChannel.createMany({
      data: channelQueue.map((promotionId: number, idx: number) => ({
        battleId: battle.id,
        promotionId,
        order: idx + 1
      }))
    })
  }

  res.json(battle)
})

// Admin: edit battle
router.patch('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)
  const { title, description, category, entryFee, minParticipants, startsAt, endsAt, prizeType, prizeConfig, sponsorPool } = req.body

  const battle = await prisma.battle.update({
    where: { id: battleId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(entryFee !== undefined && { entryFee }),
      ...(minParticipants !== undefined && { minParticipants }),
      ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
      ...(endsAt !== undefined && { endsAt: new Date(endsAt) }),
      ...(prizeType !== undefined && { prizeType }),
      ...(prizeConfig !== undefined && { prizeConfig }),
      ...(sponsorPool !== undefined && { sponsorPool }),
    }
  })
  res.json(battle)
})

// Admin: delete battle (only UPCOMING or CANCELLED)
router.delete('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)

  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { entries: { select: { userId: true, id: true } } }
  })
  if (!battle) return res.status(404).json({ error: 'Battle not found' })
  if (battle.status === 'ACTIVE') return res.status(400).json({ error: 'Cannot delete an active battle. Finish it first.' })

  // Refund entry fees if any entries exist
  if (battle.entries.length > 0 && battle.entryFee > 0) {
    await prisma.$transaction(
      battle.entries.map(e =>
        prisma.user.update({ where: { id: e.userId }, data: { balance: { increment: battle.entryFee } } })
      )
    )
  }

  await prisma.battle.delete({ where: { id: battleId } })
  res.json({ success: true })
})

// Admin: suspicious votes report
router.get('/:id/suspicious', adminOnly, async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)
  const DAY = 7 * 24 * 60 * 60 * 1000 // accounts newer than 7 days

  const votes = await prisma.vote.findMany({
    where: { entry: { battleId } },
    include: {
      user: { select: { id: true, username: true, firstName: true, createdAt: true } },
      entry: { select: { id: true, userId: true, user: { select: { firstName: true, username: true } } } }
    }
  })

  // Group votes by entry
  const byEntry: Record<number, { entryUser: any; votes: any[]; newAccountVotes: number }> = {}
  for (const vote of votes) {
    const eid = vote.entry.id
    if (!byEntry[eid]) byEntry[eid] = { entryUser: vote.entry.user, votes: [], newAccountVotes: 0 }
    byEntry[eid].votes.push(vote.user)
    if (Date.now() - new Date(vote.user.createdAt).getTime() < DAY) {
      byEntry[eid].newAccountVotes++
    }
  }

  // Group votes by voter → how many distinct entries each voter voted for in this battle
  const byVoter: Record<number, Set<number>> = {}
  for (const vote of votes) {
    if (!byVoter[vote.user.id]) byVoter[vote.user.id] = new Set()
    byVoter[vote.user.id].add(vote.entry.id)
  }

  // For each entry, count how many of its voters voted ONLY for that entry (exclusive voters)
  const exclusiveByEntry: Record<number, number> = {}
  for (const vote of votes) {
    const eid = vote.entry.id
    if (byVoter[vote.user.id].size === 1) {
      exclusiveByEntry[eid] = (exclusiveByEntry[eid] || 0) + 1
    }
  }

  const totalVotes = votes.length
  const suspicious = Object.entries(byEntry).map(([entryId, data]) => {
    const eid = parseInt(entryId)
    const concentration = totalVotes > 0 ? Math.round(data.votes.length / totalVotes * 100) : 0
    const exclusiveVoters = exclusiveByEntry[eid] || 0
    return {
      entryId: eid,
      entryUser: data.entryUser,
      voteCount: data.votes.length,
      concentration,
      newAccountVotes: data.newAccountVotes,
      exclusiveVoters,
      suspicious: concentration >= 60 || data.newAccountVotes >= 3 || exclusiveVoters >= 3,
      voters: data.votes
    }
  }).sort((a, b) => b.voteCount - a.voteCount)

  res.json({ totalVotes, entries: suspicious })
})

// Admin: finish battle manually
router.post('/:id/finish', adminOnly, async (req: AuthRequest, res: Response) => {
  const battleId = parseInt(req.params.id as string)
  await finishBattle(battleId)
  res.json({ success: true })
})

export default router
