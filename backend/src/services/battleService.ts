import prisma from '../db'

const PRIZE_DISTRIBUTION = [0.50, 0.25, 0.15] // 1st, 2nd, 3rd place
const PLATFORM_CUT = 0.10 // 10%

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

  // Set rank for remaining entries, then delete their rows (free base64 photo data)
  const loserIds: number[] = []
  for (let i = 3; i < battle.entries.length; i++) {
    loserIds.push(battle.entries[i].id)
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

  await prisma.battle.updateMany({
    where: {
      status: 'UPCOMING',
      startsAt: { lte: now }
    },
    data: { status: 'ACTIVE' }
  })
}
