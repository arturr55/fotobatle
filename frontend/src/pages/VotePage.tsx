import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { useBattles, useVoteEntry, useVote } from '../hooks/useBattles'
import { useUser } from '../hooks/useUser'
import { mediaUrl } from '../api/client'

const REACTIONS = [
  { id: 'heart', emoji: '❤️', points: 1, label: 'Нравится' },
  { id: 'fire', emoji: '🔥', points: 3, label: 'Огонь!' },
  { id: 'wow', emoji: '😍', points: 2, label: 'Вау' },
  { id: 'clap', emoji: '👏', points: 1, label: 'Класс' },
]

const GLASS_BG = 'rgba(8,8,18,0.96)'
const SWIPE_THRESHOLD = 80

function VoteCard({ battleId, bonusVotes }: { battleId: number; bonusVotes: number }) {
  const { data: entry, isLoading, refetch } = useVoteEntry(battleId)
  const vote = useVote(battleId)
  const [voted, setVoted] = useState<string | null>(null)
  const [bonusUsed, setBonusUsed] = useState(false)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
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
      refetch()
    }, 900)
  }

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    const offsetX = info.offset.x
    if (offsetX > SWIPE_THRESHOLD) {
      // Swipe right → fire
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.3 } })
      x.set(0)
      await controls.start({ x: 0, opacity: 1, transition: { duration: 0 } })
      handleVote('fire')
    } else if (offsetX < -SWIPE_THRESHOLD) {
      // Swipe left → skip
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.3 } })
      x.set(0)
      await controls.start({ x: 0, opacity: 1, transition: { duration: 0 } })
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
      <div className="absolute inset-0" style={{ background: '#fcfeff' }}>
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl flex flex-col items-center justify-center px-8 text-center"
          style={{ height: '52%', background: '#1a162a' }}
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
        initial={{ opacity: 0, scale: 1.04 }}
        animate={controls}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3 }}
        style={{ x, rotate }}
        drag="x"
        dragElastic={0.7}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      >
        {/* Fullscreen photo */}
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
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 28%, transparent 52%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.88) 100%)',
          }}
        />

        {/* Swipe right indicator — 🔥 */}
        <motion.div
          style={{ opacity: fireOpacity }}
          className="absolute top-24 left-6 z-20 pointer-events-none"
        >
          <div className="px-4 py-2 rounded-2xl border-4 border-[#fe7b11] rotate-[-15deg]">
            <span className="text-[#fe7b11] font-black text-2xl tracking-wider">ОГОНЬ 🔥</span>
          </div>
        </motion.div>

        {/* Swipe left indicator — skip */}
        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute top-24 right-6 z-20 pointer-events-none"
        >
          <div className="px-4 py-2 rounded-2xl border-4 border-white/60 rotate-[15deg]">
            <span className="text-white/80 font-black text-2xl tracking-wider">ПРОПУСК ⏭</span>
          </div>
        </motion.div>

        {/* Vote feedback emoji */}
        {voted && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <span
              className="text-9xl"
              style={{ filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.4))' }}
            >
              {REACTIONS.find(r => r.id === voted)?.emoji}
            </span>
          </motion.div>
        )}

        {/* Bottom glass panel */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg
            viewBox="0 0 390 44"
            preserveAspectRatio="none"
            className="w-full"
            style={{ display: 'block', marginBottom: -1 }}
          >
            <path
              d="M0,44 C55,14 110,38 195,22 C280,6 335,34 390,16 L390,44 Z"
              fill={GLASS_BG}
            />
          </svg>

          <div
            className="px-5 pt-1 pb-6"
            style={{ background: GLASS_BG, backdropFilter: 'blur(24px)' }}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-extrabold text-2xl leading-tight">
                    {entry.user?.firstName || 'Участник'}
                  </h2>
                  {entry.user?.username && (
                    <p className="text-white/40 text-sm">@{entry.user.username}</p>
                  )}
                </div>
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
              <p className="text-white/30 text-xs mt-1">
                {bonusUsed ? '✨ Бонусный голос использован!' : '← пропустить · свайп вправо = 🔥 →'}
              </p>
            </div>

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
                      background: 'rgba(255,255,255,0.09)',
                      border: '1px solid rgba(255,255,255,0.13)',
                    }}
                  >
                    {r.emoji}
                  </div>
                  <span className="text-white/50 text-xs font-semibold">+{r.points}</span>
                </button>
              ))}
            </div>
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
      style={{ height: 'calc(100dvh - 80px)', background: '#fcfeff' }}
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

      {/* Battle selector tabs — overlay at top */}
      {activeBattles.length > 1 && (
        <div className="absolute top-4 left-0 right-0 z-20 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeBattles.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBattleId(b.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  currentBattle?.id === b.id ? 'text-white' : 'text-white/60'
                }`}
                style={{
                  background: currentBattle?.id === b.id ? '#fe7b11' : 'rgba(26,22,42,0.08)',
                  border: currentBattle?.id === b.id ? 'none' : '1px solid rgba(26,22,42,0.2)',
                  color: currentBattle?.id === b.id ? 'white' : '#1a162a',
                  cursor: 'pointer',
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
