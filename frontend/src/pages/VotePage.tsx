import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattles, useVoteEntry, useVote } from '../hooks/useBattles'

const REACTIONS = [
  { id: 'heart', emoji: '❤️', points: 1, label: 'Нравится' },
  { id: 'fire', emoji: '🔥', points: 3, label: 'Огонь!' },
  { id: 'wow', emoji: '😍', points: 2, label: 'Вау' },
  { id: 'clap', emoji: '👏', points: 1, label: 'Класс' },
]

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
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40 px-8 text-center">
        <span className="text-5xl mb-4">✅</span>
        <p className="text-lg font-medium text-white">Все оценено!</p>
        <p className="text-sm mt-2">Ты оценил все фото в этом батле. Возвращайся позже!</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col"
      >
        <div className="relative mx-4 rounded-3xl overflow-hidden"
          style={{ aspectRatio: '3/4', maxHeight: '60vh' }}>
          <img
            src={entry.photoUrl}
            alt="battle entry"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-4"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
            <p className="text-white font-semibold">
              {entry.user?.firstName || 'Участник'}
            </p>
            {entry.user?.username && (
              <p className="text-white/60 text-sm">@{entry.user.username}</p>
            )}
          </div>

          {voted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <span className="text-8xl">
                {REACTIONS.find(r => r.id === voted)?.emoji}
              </span>
            </motion.div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-6 px-4">
          {REACTIONS.map(r => (
            <button
              key={r.id}
              onClick={() => handleVote(r.id)}
              disabled={!!voted}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform disabled:opacity-50"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                {r.emoji}
              </div>
              <span className="text-white/50 text-xs">+{r.points}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Свайп вправо = ❤️ &nbsp;|&nbsp; Свайп влево = пропустить
        </p>
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
    <div className="flex flex-col pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-white mb-4">Голосование</h1>

        {activeBattles.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {activeBattles.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBattleId(b.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  (currentBattle?.id === b.id)
                    ? 'bg-pink-500 text-white'
                    : 'text-white/60 border border-white/10'
                }`}
                style={{ background: currentBattle?.id === b.id ? undefined : 'rgba(255,255,255,0.05)' }}
              >
                {b.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {currentBattle ? (
        <VoteCard battleId={currentBattle.id} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-white/40 px-8 text-center">
          <span className="text-5xl mb-4">🔥</span>
          <p className="text-lg font-medium text-white">Нет активных батлов</p>
          <p className="text-sm mt-2">Скоро появятся новые!</p>
        </div>
      )}
    </div>
  )
}
