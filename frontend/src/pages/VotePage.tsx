import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useBattles, useVoteEntry, useVote } from '../hooks/useBattles'
import { useUser } from '../hooks/useUser'
import { mediaUrl } from '../api/client'

const REACTIONS = [
  { id: 'heart', emoji: '❤️', points: 1 },
  { id: 'fire', emoji: '🔥', points: 3 },
  { id: 'wow', emoji: '😍', points: 2 },
  { id: 'clap', emoji: '👏', points: 1 },
]

const SWIPE_THRESHOLD = 80

function VoteCard({ battleId, bonusVotes }: { battleId: number; bonusVotes: number }) {
  const queryClient = useQueryClient()
  const { data: entry, isLoading, refetch } = useVoteEntry(battleId)
  const vote = useVote(battleId)
  const [voted, setVoted] = useState<string | null>(null)
  const [bonusUsed, setBonusUsed] = useState(false)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])
  const fireOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1])
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0])
  const controls = useAnimation()

  useEffect(() => {
    controls.start({ opacity: 1, scale: 1, x: 0 })
  }, [entry?.id])

  const handleVote = async (reaction: string) => {
    if (!entry || voted) return
    setVoted(reaction)
    try {
      const result = await vote.mutateAsync({ entryId: entry.id, reaction })
      if ((result as any)?.bonusUsed) setBonusUsed(true)
    } catch {}
    setTimeout(() => {
      setVoted(null)
      setBonusUsed(false)
      queryClient.removeQueries({ queryKey: ['vote-entry', battleId] })
      refetch()
    }, 900)
  }

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    const offsetX = info.offset.x
    if (offsetX > SWIPE_THRESHOLD) {
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.3 } })
      x.set(0)
      await controls.start({ x: 0, opacity: 1, transition: { duration: 0 } })
      handleVote('fire')
    } else if (offsetX < -SWIPE_THRESHOLD) {
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.3 } })
      x.set(0)
      await controls.start({ x: 0, opacity: 1, transition: { duration: 0 } })
      queryClient.removeQueries({ queryKey: ['vote-entry', battleId] })
      refetch()
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } })
    }
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#fe7b11', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="absolute inset-0 flex items-end" style={{ background: '#f5f3f0' }}>
        <div
          className="w-full rounded-t-3xl flex flex-col items-center justify-center px-8 text-center py-16"
          style={{ background: '#1a162a' }}
        >
          <span className="text-5xl mb-4">✅</span>
          <p className="text-2xl font-bold text-white mb-2">Все оценено!</p>
          <p className="text-sm text-white/50">Ты оценил все фото в этом баттле.</p>
          <p className="text-xs text-white/30 mt-1">Возвращайся позже!</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={controls}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.25 }}
        style={{ x, rotate }}
        drag="x"
        dragElastic={0.6}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="absolute inset-3 cursor-grab active:cursor-grabbing rounded-3xl overflow-hidden"
        style={{
          x, rotate,
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
        } as any}
      >
        {/* Photo — fills top portion */}
        <img
          src={mediaUrl(entry.photoUrl)}
          alt="battle entry"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 25%, transparent 48%, rgba(0,0,0,0.5) 68%, rgba(0,0,0,0.92) 100%)',
          }}
        />

        {/* Swipe right — ОГОНЬ */}
        <motion.div
          style={{ opacity: fireOpacity }}
          className="absolute top-10 left-5 z-20 pointer-events-none"
        >
          <div className="px-4 py-2 rounded-2xl border-4 border-[#fe7b11] rotate-[-15deg]">
            <span className="text-[#fe7b11] font-black text-2xl tracking-wider">ОГОНЬ 🔥</span>
          </div>
        </motion.div>

        {/* Swipe left — ПРОПУСК */}
        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute top-10 right-5 z-20 pointer-events-none"
        >
          <div className="px-4 py-2 rounded-2xl border-4 border-white/60 rotate-[15deg]">
            <span className="text-white/80 font-black text-2xl tracking-wider">ПРОПУСК ⏭</span>
          </div>
        </motion.div>

        {/* Vote feedback */}
        {voted && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <span className="text-9xl" style={{ filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.4))' }}>
              {REACTIONS.find(r => r.id === voted)?.emoji}
            </span>
          </motion.div>
        )}

        {/* Bottom panel */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-5 pb-5"
          style={{ background: 'rgba(8,8,18,0.93)', backdropFilter: 'blur(20px)' }}>

          {/* Name row */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-extrabold text-2xl leading-tight">
              {entry.user?.firstName || 'Участник'}
            </h2>
            <div className="flex items-center gap-2">
              {bonusVotes > 0 && (
                <span className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(254,123,17,0.25)', color: '#fe7b11' }}>
                  🎯 {bonusVotes} бонус
                </span>
              )}
              {entry.user?.allowMessages && entry.user?.username && (
                <a
                  href={`https://t.me/${entry.user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold no-underline"
                  style={{ background: 'rgba(0,152,234,0.25)', color: '#0098EA', border: '1px solid rgba(0,152,234,0.4)' }}
                >
                  ✉️ Написать
                </a>
              )}
            </div>
          </div>

          {/* Hint */}
          <p className="text-center text-sm font-medium mb-4"
            style={{ color: bonusUsed ? '#fe7b11' : 'rgba(255,255,255,0.65)' }}>
            {bonusUsed ? '✨ Бонусный голос использован!' : '← пропустить   ·   свайп вправо = 🔥 →'}
          </p>

          {/* Reaction buttons */}
          <div className="flex justify-between gap-3">
            {REACTIONS.map(r => (
              <button
                key={r.id}
                onClick={() => handleVote(r.id)}
                disabled={!!voted}
                className="flex-1 flex flex-col items-center gap-2 active:scale-90 transition-transform disabled:opacity-50"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div
                  className="w-full aspect-square rounded-2xl flex items-center justify-center text-3xl"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {r.emoji}
                </div>
                <span className="text-white/50 text-xs font-semibold">+{r.points}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function VotePage({ initialBattleId }: { initialBattleId?: number }) {
  const { data: battles } = useBattles()
  const { data: user } = useUser()
  const [selectedBattleId, setSelectedBattleId] = useState<number | null>(initialBattleId ?? null)

  const activeBattles = battles?.filter(b => b.status === 'ACTIVE') || []
  const currentBattle = selectedBattleId
    ? activeBattles.find(b => b.id === selectedBattleId)
    : activeBattles[0]

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 'calc(100dvh - 80px)', background: '#f0ede8' }}
    >
      {currentBattle ? (
        <VoteCard battleId={currentBattle.id} bonusVotes={(user as any)?.bonusVotes ?? 0} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-6xl mb-4">🔥</span>
          <p className="text-xl font-bold mb-2" style={{ color: '#1a162a' }}>Нет активных баттлов</p>
          <p className="text-sm" style={{ color: 'rgba(26,22,42,0.45)' }}>Скоро появятся новые!</p>
        </div>
      )}

      {/* Battle selector */}
      {activeBattles.length > 1 && (
        <div className="absolute top-4 left-0 right-0 z-20 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeBattles.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBattleId(b.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: currentBattle?.id === b.id ? '#fe7b11' : 'rgba(26,22,42,0.12)',
                  color: currentBattle?.id === b.id ? 'white' : '#1a162a',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {b.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
