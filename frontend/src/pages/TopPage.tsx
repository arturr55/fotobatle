import { useState } from 'react'
import { useBattles, useBattle } from '../hooks/useBattles'
import { Trophy, Star } from 'lucide-react'
import { mediaUrl } from '../api/client'

function LeaderBoard({ battleId }: { battleId: number }) {
  const { data: battle } = useBattle(battleId)

  const entries = battle?.entries || []

  return (
    <div className="flex flex-col gap-2 px-4">
      {entries.slice(0, 20).map((entry, i) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
            i === 0 ? 'bg-yellow-500 text-black' :
            i === 1 ? 'bg-gray-300 text-black' :
            i === 2 ? 'bg-amber-700 text-white' :
            'bg-white/10 text-white/60'
          }`}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
          </div>

          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">
              {entry.user?.firstName || 'Участник'}
            </p>
            {entry.user?.username && (
              <p className="text-white/40 text-xs truncate">@{entry.user.username}</p>
            )}
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-pink-400">
              <span className="font-bold text-sm">{entry.score}</span>
              <span className="text-xs">очков</span>
            </div>
            {entry.prize && (
              <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                <Star size={10} fill="currentColor" />
                <span>{entry.prize}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {entries.length === 0 && (
        <div className="text-center py-10 text-white/30">
          <p>Ещё нет участников</p>
        </div>
      )}
    </div>
  )
}

export default function TopPage() {
  const { data: battles } = useBattles()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const allBattles = battles || []
  const current = selectedId
    ? allBattles.find(b => b.id === selectedId)
    : allBattles[0]

  return (
    <div className="flex flex-col pb-24">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={20} className="text-yellow-400" fill="currentColor" />
          <h1 className="text-xl font-bold text-white">Рейтинг</h1>
        </div>

        {allBattles.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {allBattles.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  current?.id === b.id ? 'bg-yellow-500 text-black' : 'text-white/60'
                }`}
                style={{
                  background: current?.id === b.id ? undefined : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {b.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {current ? (
        <LeaderBoard battleId={current.id} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <span className="text-5xl mb-4">🏆</span>
          <p>Нет данных</p>
        </div>
      )}
    </div>
  )
}
