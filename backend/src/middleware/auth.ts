import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import prisma from '../db'

export interface AuthRequest extends Request {
  user?: {
    id: number
    telegramId: bigint
    isAdmin: boolean
  }
}

function validateTelegramData(initData: string, botToken: string): Record<string, string> | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (expectedHash !== hash) return null

  const result: Record<string, string> = {}
  params.forEach((v, k) => { result[k] = v })
  return result
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const initData = req.headers['x-init-data'] as string

  if (!initData) {
    return res.status(401).json({ error: 'No auth data' })
  }

  const botToken = process.env.BOT_TOKEN!
  const data = validateTelegramData(initData, botToken)

  if (!data) {
    return res.status(401).json({ error: 'Invalid auth data' })
  }

  const userRaw = JSON.parse(data['user'] || '{}')
  const telegramId = BigInt(userRaw.id)
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => BigInt(id.trim()))

  let user = await prisma.user.findUnique({ where: { telegramId } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: userRaw.username || null,
        firstName: userRaw.first_name || 'User',
        lastName: userRaw.last_name || null,
      }
    })
  } else {
    await prisma.user.update({
      where: { telegramId },
      data: {
        username: userRaw.username || null,
        firstName: userRaw.first_name || user.firstName,
        lastName: userRaw.last_name || null,
      }
    })
  }

  req.user = {
    id: user.id,
    telegramId: user.telegramId,
    isAdmin: adminIds.includes(telegramId)
  }

  next()
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}
