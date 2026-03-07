import prisma from '../db'
import { sendNotification } from './notifyService'

const PLATFORM_CUT = 0.25 // 25%

type PrizePlace = {
  place: number
  percent?: number
  amount?: number
  description?: string
}

export async function finishBattle(battleId: number) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { entries: { orderBy: { score: 'desc' } } }
  })

  if (!battle || battle.status !== 'ACTIVE') {
    throw new Error('Battle not available to finish')
  }

  // Check minimum participants
  if (battle.entries.length < battle.minParticipants) {
    await prisma.battle.update({ where: { id: battleId }, data: { status: 'CANCELLED' } })

    // Refund entry fees to all participants
    for (const entry of battle.entries) {
      if (battle.entryFee > 0) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: entry.userId }, data: { balance: { increment: battle.entryFee } } }),
          prisma.transaction.create({
            data: {
              userId: entry.userId,
              type: 'REFUND',
              amount: battle.entryFee,
              description: `Возврат взноса: батл "${battle.title}" отменён (мало участников)`,
              metadata: { battleId }
            }
          })
        ])
      }
      const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { telegramId: true } })
      if (user) {
        await sendNotification(user.telegramId,
          `❌ <b>Батл "${battle.title}" отменён</b>\n\nНе набралось минимум ${battle.minParticipants} участников. Взнос возвращён.`)
      }
    }
    return
  }

  await prisma.battle.update({ where: { id: battleId }, data: { status: 'FINISHED' } })

  const prizeType = battle.prizeType
  const prizeConfig = (battle.prizeConfig as PrizePlace[]) || []
  const effectivePool = battle.prizePool + battle.sponsorPool
  const distributablePool = Math.floor(effectivePool * (1 - PLATFORM_CUT))
  const medals = ['🥇', '🥈', '🥉']

  const winnerCount = prizeConfig.length || 3
  const winners = battle.entries.slice(0, winnerCount)

  for (let i = 0; i < winners.length; i++) {
    const entry = winners[i]
    const config = prizeConfig[i]
    if (!config) continue

    let prize = 0

    if (prizeType === 'POOL_PERCENT' && config.percent) {
      prize = Math.floor(distributablePool * config.percent / 100)
    } else if (prizeType === 'FIXED' && config.amount != null) {
      prize = config.amount
    } else if (prizeType === 'GIFT') {
      prize = 0 // no Stars, admin handles manually
    }

    await prisma.battleEntry.update({
      where: { id: entry.id },
      data: { rank: i + 1, prize }
    })

    if (prize > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: entry.userId },
          data: {
            balance: { increment: prize },
            totalEarned: { increment: prize },
            totalWins: i === 0 ? { increment: 1 } : undefined
          }
        }),
        prisma.transaction.create({
          data: {
            userId: entry.userId,
            type: 'PRIZE',
            amount: prize,
            description: `Приз за #${i + 1} место в "${battle.title}"`,
            metadata: { battleId, rank: i + 1 }
          }
        })
      ])
    } else if (prizeType === 'GIFT' && i === 0) {
      await prisma.user.update({
        where: { id: entry.userId },
        data: { totalWins: { increment: 1 } }
      })
    }

    // Notify winner
    const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { telegramId: true } })
    if (user) {
      const medal = medals[i] || `#${i + 1}`
      if (prizeType === 'GIFT' && config.description) {
        await sendNotification(user.telegramId,
          `${medal} <b>Батл "${battle.title}" завершён!</b>\n\nТы занял ${i + 1} место! 🎁 Приз: <b>${config.description}</b>\nАдмин свяжется с тобой для вручения.`)
      } else if (prize > 0) {
        await sendNotification(user.telegramId,
          `${medal} <b>Батл "${battle.title}" завершён!</b>\n\nТы занял ${i + 1} место и получил <b>${prize} BS⭐</b>! 🎉`)
      }
    }
  }

  // Notify non-winners and delete their entries
  const loserIds: number[] = []
  for (let i = winnerCount; i < battle.entries.length; i++) {
    const entry = battle.entries[i]
    loserIds.push(entry.id)
    const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { telegramId: true } })
    if (user) {
      await sendNotification(user.telegramId,
        `🏁 <b>Батл "${battle.title}" завершён.</b>\n\nТы не попал в топ. Попробуй снова в следующем батле!`)
    }
  }

  if (loserIds.length > 0) {
    await prisma.battleEntry.deleteMany({ where: { id: { in: loserIds } } })
  }
}

export async function checkAndFinishExpiredBattles() {
  const now = new Date()
  const expiredBattles = await prisma.battle.findMany({
    where: { status: 'ACTIVE', endsAt: { lte: now } }
  })
  for (const battle of expiredBattles) {
    try {
      await finishBattle(battle.id)
      console.log(`Finished battle ${battle.id}: ${battle.title}`)
    } catch (err) {
      console.error(`Error finishing battle ${battle.id}:`, err)
    }
  }
}

export async function activateUpcomingBattles() {
  const now = new Date()

  const battlesToActivate = await prisma.battle.findMany({
    where: { status: 'UPCOMING', startsAt: { lte: now } },
    include: { entries: { include: { user: { select: { telegramId: true } } } } }
  })

  for (const battle of battlesToActivate) {
    await prisma.battle.update({ where: { id: battle.id }, data: { status: 'ACTIVE' } })
    for (const entry of battle.entries) {
      await sendNotification(entry.user.telegramId,
        `📸 <b>Батл "${battle.title}" начался!</b>\n\nГолосование открыто — поделись ссылкой, чтобы получить больше голосов!`)
    }
  }
}
