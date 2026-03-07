import prisma from '../db'

// Track last reset month to avoid double-reset
let lastResetMonth = -1

export async function resetAchievementsIfNewMonth() {
  const now = new Date()
  const currentMonth = now.getFullYear() * 12 + now.getMonth()
  if (lastResetMonth === currentMonth) return
  lastResetMonth = currentMonth

  await prisma.user.updateMany({
    data: {
      streakDays: 0,
      lastEntryDate: null,
      achievements: [],
    }
  })
  console.log(`Monthly achievements reset done (${now.toISOString()})`)
}

const ACHIEVEMENTS = [
  { id: 'first_battle',  label: 'Первый батл!',          condition: (count: number, _streak: number) => count === 1, bonus: 1 },
  { id: 'streak_2',      label: '2 дня подряд!',          condition: (_count: number, streak: number) => streak >= 2,  bonus: 1 },
  { id: 'battles_5',     label: '5 батлов участия!',      condition: (count: number, _streak: number) => count === 5,  bonus: 2 },
  { id: 'streak_5',      label: '5 дней подряд!',         condition: (_count: number, streak: number) => streak >= 5,  bonus: 2 },
  { id: 'battles_10',    label: '10 батлов участия!',     condition: (count: number, _streak: number) => count === 10, bonus: 3 },
]

export async function checkAchievements(userId: number): Promise<{ label: string; bonus: number }[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { achievements: true, lastEntryDate: true, streakDays: true }
  })
  if (!user) return []

  const unlocked = (user.achievements as string[]) || []
  const totalEntries = await prisma.battleEntry.count({ where: { userId } })

  // Update streak
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let newStreak = 1
  if (user.lastEntryDate) {
    const last = new Date(user.lastEntryDate)
    last.setHours(0, 0, 0, 0)
    if (last.getTime() === yesterday.getTime()) {
      newStreak = user.streakDays + 1
    } else if (last.getTime() === today.getTime()) {
      newStreak = user.streakDays // already entered today
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { streakDays: newStreak, lastEntryDate: new Date() }
  })

  // Check newly unlocked achievements
  const newlyUnlocked: { label: string; bonus: number }[] = []

  for (const a of ACHIEVEMENTS) {
    if (unlocked.includes(a.id)) continue
    if (a.condition(totalEntries, newStreak)) {
      newlyUnlocked.push({ label: a.label, bonus: a.bonus })
      unlocked.push(a.id)
    }
  }

  if (newlyUnlocked.length > 0) {
    const totalBonus = newlyUnlocked.reduce((sum, a) => sum + a.bonus, 0)
    await prisma.user.update({
      where: { id: userId },
      data: {
        achievements: unlocked,
        bonusVotes: { increment: totalBonus }
      }
    })
  }

  return newlyUnlocked
}
