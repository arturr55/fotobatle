import prisma from '../db'
import { sendNotification } from './notifyService'

const PRIZE_DISTRIBUTION = [0.50, 0.25, 0.15] // 1st, 2nd, 3rd place
const PLATFORM_CUT = 0.25 // 25%

export async function finishBattle(battleId: number) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      entries: {
        orderBy: { score: 'desc' }
      }
    }
  })

  if (!battle || battle.status !== 'ACTIVE') {
    throw new Error('Battle not available to finish')
  }

  const prizePool = battle.prizePool
  const platformCut = Math.floor(prizePool * PLATFORM_CUT)
  const distributablePool = prizePool - platformCut

  await prisma.battle.update({
    where: { id: battleId },
    data: { status: 'FINISHED' }
  })

  const winners = battle.entries.slice(0, 3)

  for (let i = 0; i < winners.length; i++) {
    const entry = winners[i]
    const prizePercent = PRIZE_DISTRIBUTION[i] || 0
    const prize = Math.floor(distributablePool * prizePercent)

    if (prize <= 0) continue

    await prisma.$transaction([
      prisma.battleEntry.update({
        where: { id: entry.id },
        data: { rank: i + 1, prize }
      }),
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
          description: `Prize for #${i + 1} place in "${battle.title}"`,
          metadata: { battleId, rank: i + 1 }
        }
      })
    ])
  }

  // Notify winners
  for (let i = 0; i < winners.length; i++) {
    const entry = winners[i]
    const prize = Math.floor(distributablePool * (PRIZE_DISTRIBUTION[i] || 0))
    const medals = ['🥇', '🥈', '🥉']
    const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { telegramId: true } })
    if (user) {
      await sendNotification(user.telegramId,
        `${medals[i]} <b>Батл "${battle.title}" завершён!</b>\n\nТы занял ${i + 1} место и получил <b>${prize} монет</b>! 🎉`)
    }
  }

  // Notify non-winners (entries after top-3)
  const loserIds: number[] = []
  for (let i = 3; i < battle.entries.length; i++) {
    const entry = battle.entries[i]
    loserIds.push(entry.id)
    const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { telegramId: true } })
    if (user) {
      await sendNotification(user.telegramId,
        `🏁 <b>Батл "${battle.title}" завершён.</b>\n\nТы не попал в топ-3 в этот раз. Попробуй снова в следующем батле!`)
    }
  }

  if (loserIds.length > 0) {
    await prisma.battleEntry.deleteMany({ where: { id: { in: loserIds } } })
  }
}

export async function checkAndFinishExpiredBattles() {
  const now = new Date()

  const expiredBattles = await prisma.battle.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lte: now }
    }
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
    include: {
      entries: {
        include: { user: { select: { telegramId: true } } }
      }
    }
  })

  for (const battle of battlesToActivate) {
    await prisma.battle.update({ where: { id: battle.id }, data: { status: 'ACTIVE' } })

    for (const entry of battle.entries) {
      await sendNotification(entry.user.telegramId,
        `📸 <b>Батл "${battle.title}" начался!</b>\n\nГолосование открыто — теперь другие оценивают твоё фото. Поделись ссылкой, чтобы получить больше голосов!`)
    }
  }
}
