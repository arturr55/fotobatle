import { Router, Response } from 'express'
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth'
import prisma from '../db'
import { sendNotification } from '../services/notifyService'

const router = Router()
router.use(authMiddleware)

const BOT_TOKEN = process.env.BOT_TOKEN || ''

// Check channel subscription
router.get('/check-sub/:channel', async (req: AuthRequest, res: Response) => {
  const channel = (req.params.channel as string).replace('@', '')
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { telegramId: true } })
  if (!user) return res.status(404).json({ error: 'User not found' })

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: `@${channel}`, user_id: user.telegramId.toString() })
    })
    const data = await r.json() as any
    const status = data.result?.status
    const isSubscribed = ['member', 'administrator', 'creator'].includes(status)
    res.json({ isSubscribed })
  } catch {
    res.json({ isSubscribed: false })
  }
})

// Get all active tasks
router.get('/', async (_req: AuthRequest, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: { status: { in: ['ACTIVE', 'FINISHED'] } },
    include: {
      _count: { select: { entries: true } },
      creator: { select: { firstName: true, username: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json(tasks)
})

// Get pending tasks (own + admin)
router.get('/my', async (req: AuthRequest, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: { creatorId: req.user!.id },
    include: { _count: { select: { entries: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json(tasks)
})

// Admin: get pending tasks
router.get('/admin/pending', adminOnly, async (_req: AuthRequest, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: { status: 'PENDING_PAYMENT' },
    include: { creator: { select: { firstName: true, username: true, telegramId: true } } },
    orderBy: { createdAt: 'asc' }
  })
  res.json(tasks)
})

// Get single task
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { score: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, firstName: true, username: true } },
          votes: { where: { userId: req.user!.id }, select: { id: true } }
        }
      },
      _count: { select: { entries: true } },
      creator: { select: { id: true, firstName: true, username: true } }
    }
  })
  if (!task) return res.status(404).json({ error: 'Not found' })
  res.json(task)
})

// Get random unvoted entry for voting
router.get('/:id/vote-entry', async (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.id as string)

  const alreadyVoted = await prisma.taskVote.findMany({
    where: { userId: req.user!.id, entry: { taskId } },
    select: { entryId: true }
  })
  const votedIds = alreadyVoted.map(v => v.entryId)

  const entry = await prisma.taskEntry.findFirst({
    where: {
      taskId,
      userId: { not: req.user!.id },
      id: { notIn: votedIds.length > 0 ? votedIds : undefined }
    },
    include: { user: { select: { id: true, firstName: true, username: true } } },
    orderBy: { createdAt: 'asc' }
  })

  res.json(entry || null)
})

// Create task
router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, channelUsername, budget, endsAt, minParticipants, prizeConfig } = req.body

  if (!title || !channelUsername || !endsAt) {
    return res.status(400).json({ error: 'Обязательные поля: название, канал, дата окончания' })
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || '',
      channelUsername: channelUsername.replace('@', ''),
      budget: parseFloat(budget) || 0,
      endsAt: new Date(endsAt),
      minParticipants: minParticipants || 2,
      prizeConfig: prizeConfig || [],
      creatorId: req.user!.id,
      status: 'PENDING_PAYMENT'
    }
  })
  res.json(task)
})

// Confirm TON payment → activate task
router.post('/:id/confirm-payment', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)
  const { txHash } = req.body

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return res.status(404).json({ error: 'Not found' })
  if (task.creatorId !== req.user!.id && !req.user!.isAdmin) return res.status(403).json({ error: 'Forbidden' })
  if (task.status !== 'PENDING_PAYMENT') return res.status(400).json({ error: 'Already confirmed' })

  await prisma.task.update({
    where: { id },
    data: { status: 'ACTIVE', paymentTxHash: txHash || null }
  })

  res.json({ success: true })
})

// Admin: activate task manually
router.post('/:id/activate', adminOnly, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)
  await prisma.task.update({ where: { id }, data: { status: 'ACTIVE' } })
  res.json({ success: true })
})

// Enter task
router.post('/:id/enter', async (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.id as string)
  const { photo } = req.body

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return res.status(404).json({ error: 'Not found' })
  if (task.status !== 'ACTIVE') return res.status(400).json({ error: 'Task not accepting entries' })

  const existing = await prisma.taskEntry.findUnique({
    where: { taskId_userId: { taskId, userId: req.user!.id } }
  })
  if (existing) return res.status(400).json({ error: 'Already entered' })

  if (!photo || !photo.startsWith('data:image')) return res.status(400).json({ error: 'Photo required' })

  await prisma.taskEntry.create({
    data: { taskId, userId: req.user!.id, photoUrl: photo }
  })

  res.json({ success: true })
})

// Vote on task entry
router.post('/entries/:entryId/vote', async (req: AuthRequest, res: Response) => {
  const entryId = parseInt(req.params.entryId as string)
  const { reaction } = req.body

  const points: Record<string, number> = { heart: 1, fire: 3, wow: 2, clap: 1 }
  const pts = points[reaction]
  if (!pts) return res.status(400).json({ error: 'Invalid reaction' })

  const entry = await prisma.taskEntry.findUnique({ where: { id: entryId }, include: { task: true } })
  if (!entry) return res.status(404).json({ error: 'Not found' })
  if (entry.userId === req.user!.id) return res.status(400).json({ error: 'Cannot vote own' })
  if (entry.task.status !== 'ACTIVE') return res.status(400).json({ error: 'Voting not available' })

  const existing = await prisma.taskVote.findUnique({
    where: { entryId_userId: { entryId, userId: req.user!.id } }
  })
  if (existing) return res.status(400).json({ error: 'Already voted' })

  await prisma.$transaction([
    prisma.taskVote.create({ data: { entryId, userId: req.user!.id, reaction, points: pts } }),
    prisma.taskEntry.update({ where: { id: entryId }, data: { score: { increment: pts } } })
  ])

  res.json({ success: true, points: pts })
})

// Admin: finish task and distribute prizes
router.post('/:id/finish', adminOnly, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)
  const task = await prisma.task.findUnique({
    where: { id },
    include: { entries: { orderBy: { score: 'desc' } } }
  })
  if (!task || task.status !== 'ACTIVE') return res.status(400).json({ error: 'Not active' })

  await prisma.task.update({ where: { id }, data: { status: 'FINISHED' } })

  const prizeConfig = (task.prizeConfig as any[]) || []
  const medals = ['🥇', '🥈', '🥉']

  for (let i = 0; i < Math.min(prizeConfig.length, task.entries.length); i++) {
    const entry = task.entries[i]
    const cfg = prizeConfig[i]
    const prize = cfg?.amount || 0

    await prisma.taskEntry.update({ where: { id: entry.id }, data: { rank: i + 1, prize } })

    if (prize > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: entry.userId },
          data: { balance: { increment: prize }, totalEarned: { increment: prize }, totalWins: i === 0 ? { increment: 1 } : undefined }
        }),
        prisma.transaction.create({
          data: {
            userId: entry.userId,
            type: 'PRIZE',
            amount: prize,
            description: `Приз за #${i + 1} место в задании "${task.title}"`,
            metadata: { taskId: id, rank: i + 1 }
          }
        })
      ])
    }

    const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { telegramId: true } })
    if (user) {
      const giftDesc = cfg?.description
      if (giftDesc && !prize) {
        await sendNotification(user.telegramId, `${medals[i] || `#${i + 1}`} <b>Задание "${task.title}" завершено!</b>\n\n🎁 Приз: <b>${giftDesc}</b>\nАдмин свяжется с тобой.`)
      } else if (prize > 0) {
        await sendNotification(user.telegramId, `${medals[i] || `#${i + 1}`} <b>Задание "${task.title}" завершено!</b>\n\nТы получил <b>${prize} BS⭐</b>! 🎉`)
      }
    }
  }

  res.json({ success: true })
})

export default router
