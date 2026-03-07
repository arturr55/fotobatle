import { Router, Response } from 'express'
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth'
import prisma from '../db'
import { sendNotification } from '../services/notifyService'

const router = Router()
router.use(authMiddleware)

async function getPricePerSub(): Promise<number> {
  const config = await prisma.platformConfig.findUnique({ where: { key: 'pricePerSubscriber' } })
  return config ? parseFloat(config.value) : 0.01
}

// Get price per subscriber (public — needed for form calculation)
router.get('/config/price', async (_req: AuthRequest, res: Response) => {
  const price = await getPricePerSub()
  res.json({ pricePerSub: price })
})

// Admin: set price per subscriber
router.post('/config/price', adminOnly, async (req: AuthRequest, res: Response) => {
  const { price } = req.body
  if (!price || isNaN(parseFloat(price))) return res.status(400).json({ error: 'Invalid price' })
  await prisma.platformConfig.upsert({
    where: { key: 'pricePerSubscriber' },
    update: { value: price.toString() },
    create: { key: 'pricePerSubscriber', value: price.toString() }
  })
  res.json({ success: true, pricePerSub: parseFloat(price) })
})

// Create promotion request
router.post('/', async (req: AuthRequest, res: Response) => {
  const { channelUsername, targetSubscribers } = req.body
  if (!channelUsername || !targetSubscribers || targetSubscribers < 10) {
    return res.status(400).json({ error: 'channelUsername and targetSubscribers (min 10) required' })
  }

  const pricePerSub = await getPricePerSub()
  const budgetTon = pricePerSub * targetSubscribers

  const promotion = await prisma.channelPromotion.create({
    data: {
      ownerId: req.user!.id,
      channelUsername: channelUsername.replace('@', ''),
      targetSubscribers: parseInt(targetSubscribers),
      budgetTon,
    }
  })
  res.json(promotion)
})

// My promotions
router.get('/my', async (req: AuthRequest, res: Response) => {
  const promotions = await prisma.channelPromotion.findMany({
    where: { ownerId: req.user!.id },
    orderBy: { createdAt: 'desc' }
  })
  res.json(promotions)
})

// Active promotions (for admin battle creation selector)
router.get('/active', adminOnly, async (_req: AuthRequest, res: Response) => {
  const promotions = await prisma.channelPromotion.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' }
  })
  res.json(promotions)
})

// Admin: pending review
router.get('/admin/pending', adminOnly, async (_req: AuthRequest, res: Response) => {
  const promotions = await prisma.channelPromotion.findMany({
    where: { status: { in: ['PENDING_REVIEW', 'PENDING_PAYMENT'] } },
    include: { owner: { select: { firstName: true, username: true, telegramId: true } } },
    orderBy: { createdAt: 'asc' }
  })
  res.json(promotions)
})

// Admin: approve — set PENDING_PAYMENT + 1-hour deadline + notify owner
router.post('/:id/approve', adminOnly, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)

  const promotion = await prisma.channelPromotion.findUnique({
    where: { id },
    include: { owner: { select: { telegramId: true } } }
  })
  if (!promotion) return res.status(404).json({ error: 'Not found' })
  if (promotion.status !== 'PENDING_REVIEW') return res.status(400).json({ error: 'Not in review' })

  const paymentDeadline = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.channelPromotion.update({
    where: { id },
    data: { status: 'PENDING_PAYMENT', paymentDeadline }
  })

  const deadline = paymentDeadline.toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
  await sendNotification(
    promotion.owner.telegramId,
    `✅ Заявка на продвижение @${promotion.channelUsername} одобрена!\n\n💎 Оплатите <b>${promotion.budgetTon.toFixed(4)} TON</b> до ${deadline}.\n\nОткройте приложение и перейдите в Профиль → Мои каналы для оплаты.`
  )

  res.json({ success: true })
})

// Confirm TON payment (owner submits txHash)
router.post('/:id/confirm-payment', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)
  const { txHash } = req.body

  const promotion = await prisma.channelPromotion.findUnique({ where: { id } })
  if (!promotion) return res.status(404).json({ error: 'Not found' })
  if (promotion.ownerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })
  if (promotion.status !== 'PENDING_PAYMENT') return res.status(400).json({ error: 'Not awaiting payment' })

  if (promotion.paymentDeadline && new Date() > promotion.paymentDeadline) {
    await prisma.channelPromotion.update({ where: { id }, data: { status: 'EXPIRED' } })
    return res.status(400).json({ error: 'Deadline expired' })
  }

  await prisma.channelPromotion.update({ where: { id }, data: { status: 'ACTIVE', txHash } })
  res.json({ success: true })
})

// Admin: cancel
router.post('/:id/cancel', adminOnly, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string)
  const promotion = await prisma.channelPromotion.findUnique({
    where: { id },
    include: { owner: { select: { telegramId: true } } }
  })
  if (!promotion) return res.status(404).json({ error: 'Not found' })

  await prisma.channelPromotion.update({ where: { id }, data: { status: 'CANCELLED' } })

  await sendNotification(
    promotion.owner.telegramId,
    `❌ Заявка на продвижение канала @${promotion.channelUsername} отклонена администратором.`
  )

  res.json({ success: true })
})

export default router
