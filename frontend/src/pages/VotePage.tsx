import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattles, useVoteEntry, useVote } from '../hooks/useBattles'
import { mediaUrl } from '../api/client'

const REACTIONS = [
  { id: 'heart', emoji: '❤️', points: 1, label: 'Нравится' },
  { id: 'fire', emoji: '🔥', points: 3, label: 'Огонь!' },
  { id: 'wow', emoji: '😍', points: 2, label: 'Вау' },
  { id: 'clap', emoji: '👏', points: 1, label: 'Класс' },
]

const GLASS_BG = 'rgba(8,8,18,0.96)'

function VoteCard({ battleId }: { battleId: number }) {
  const { data: entry, isLoading, refetch } = useVoteEntry(battleId)
  const vote = useVote(battleId)
  const [voted, setVoted] = useState<string | null>(null)

  const handleVote = async (reaction: string) => {
    if (!entry || voted) return
    setVoted(reaction)
    await vote.mutateAsync({ entryId: entry.id, reaction })
    setTimeout(() => {
      setVoted(null)
      refetch()
    }, 800)
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
        style={{ background: '#080812' }}
      >
        <span className="text-6xl mb-4">✅</span>
        <p className="text-xl font-bold text-white mb-2">Все оценено!</p>
        <p className="text-sm text-white/40">Ты оценил все фото в этом батле.</p>
        <p className="text-xs text-white/25 mt-1">Возвращайся позже!</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0"
      >
        {/* Fullscreen photo */}
        <img
          src={mediaUrl(entry.photoUrl)}
          alt="battle entry"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay — dark at top and bottom, transparent in middle */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 28%, transparent 52%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.88) 100%)',
          }}
        />

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
          {/* Wavy top edge of glass panel */}
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

          {/* Glass content */}
          <div
            className="px-5 pt-1 pb-6"
            style={{ background: GLASS_BG, backdropFilter: 'blur(24px)' }}
          >
            {/* User info */}
            <div className="mb-5">
              <h2 className="text-white font-extrabold text-2xl leading-tight">
                {entry.user?.firstName || 'Участник'}
              </h2>
              {entry.user?.username && (
                <p className="text-white/40 text-sm">@{entry.user.username}</p>
              )}
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

export default function VotePage() {
  const { data: battles } = useBattles()
  const [selectedBattleId, setSelectedBattleId] = useState<number | null>(null)

  const activeBattles = battles?.filter(b => b.status === 'ACTIVE') || []
  const currentBattle = selectedBattleId
    ? activeBattles.find(b => b.id === selectedBattleId)
    : activeBattles[0]

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 'calc(100dvh - 80px)', background: '#080812' }}
    >
      {currentBattle ? (
        <VoteCard battleId={currentBattle.id} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-6xl mb-4">🔥</span>
          <p className="text-xl font-bold text-white mb-2">Нет активных батлов</p>
          <p className="text-sm text-white/40">Скоро появятся новые!</p>
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
                  background:
                    currentBattle?.id === b.id ? 'rgba(236,72,153,0.85)' : 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
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
