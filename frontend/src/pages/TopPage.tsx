import { useState } from 'react'
import { useBattles, useBattle, useFinishedBattles } from '../hooks/useBattles'
import { Trophy, Star, Medal } from 'lucide-react'
import { mediaUrl } from '../api/client'
import type { Battle } from '../api/client'

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

          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
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

function WinnersSection() {
  const { data: finished } = useFinishedBattles()
  const battles = finished || []

  if (battles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/30">
        <span className="text-5xl mb-4">🏆</span>
        <p>Завершённых батлов пока нет</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4">
      {battles.map((battle: Battle) => (
        <div key={battle.id}>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">{battle.title}</p>
          <div className="flex flex-col gap-2">
            {(battle.entries || []).map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{entry.user?.firstName || 'Участник'}</p>
                  {entry.user?.username && <p className="text-white/40 text-xs">@{entry.user.username}</p>}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1 text-pink-400 text-sm font-bold">
                    {entry.score} <span className="text-xs font-normal">очков</span>
                  </div>
                  {entry.prize != null && entry.prize > 0 && (
                    <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                      <Star size={10} fill="currentColor" />
                      <span>+{entry.prize}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(battle.entries || []).length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">Нет данных о победителях</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TopPage() {
  const { data: battles } = useBattles()
  const [tab, setTab] = useState<'live' | 'winners'>('live')
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

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('live')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === 'live' ? 'bg-yellow-500 text-black' : 'text-white/60'}`}
            style={{ background: tab === 'live' ? undefined : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Активные
          </button>
          <button
            onClick={() => setTab('winners')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === 'winners' ? 'bg-yellow-500 text-black' : 'text-white/60'}`}
            style={{ background: tab === 'winners' ? undefined : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Medal size={13} />
            Победители
          </button>
        </div>

        {tab === 'live' && allBattles.length > 1 && (
          <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1">
            {allBattles.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`flex-shrink-0 text-sm font-medium transition-all pb-1 ${
                  current?.id === b.id
                    ? 'text-white border-b-2 border-pink-500'
                    : 'text-white/40 border-b-2 border-transparent'
                }`}
                style={{ background: 'none', border: 'none', borderBottom: current?.id === b.id ? '2px solid #ec4899' : '2px solid transparent', cursor: 'pointer' }}
              >
                {b.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'live' ? (
        current ? (
          <LeaderBoard battleId={current.id} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <span className="text-5xl mb-4">🏆</span>
            <p>Нет активных батлов</p>
          </div>
        )
      ) : (
        <WinnersSection />
      )}
    </div>
  )
}
