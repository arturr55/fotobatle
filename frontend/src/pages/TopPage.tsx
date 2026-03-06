import { useState } from 'react'
import { useBattles, useBattle, useFinishedBattles } from '../hooks/useBattles'
import { Trophy, Star, Medal } from 'lucide-react'
import { mediaUrl } from '../api/client'
import type { Battle } from '../api/client'

function LeaderBoard({ battleId }: { battleId: number }) {
  const { data: battle } = useBattle(battleId)
  const entries = battle?.entries || []

  if (entries.length === 0) {
    return <div className="text-center py-10 text-white/30">Ещё нет участников</div>
  }

  const [first, ...rest] = entries

  return (
    <div className="flex flex-col gap-3 px-4">
      {/* 1st place — full width big card */}
      <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
        <img src={mediaUrl(first.photoUrl)} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))' }} />
        <div className="absolute top-3 left-3 text-2xl">🥇</div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-bold text-lg">{first.user?.firstName || 'Участник'}</p>
          {first.user?.username && <p className="text-white/60 text-sm">@{first.user.username}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-pink-400 font-bold">{first.score} очков</span>
            {first.prize ? <span className="text-yellow-400 text-sm">+{first.prize} ⭐</span> : null}
          </div>
        </div>
      </div>

      {/* 2nd and 3rd — side by side */}
      {rest.slice(0, 2).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rest.slice(0, 2).map((entry, i) => (
            <div key={entry.id} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
              <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))' }} />
              <div className="absolute top-2 left-2 text-xl">{i === 0 ? '🥈' : '🥉'}</div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white font-semibold text-sm truncate">{entry.user?.firstName || 'Участник'}</p>
                <span className="text-pink-400 text-xs font-bold">{entry.score} очков</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rest — compact list */}
      {rest.slice(2).map((entry, i) => (
        <div key={entry.id} className="flex items-center gap-3 p-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="text-white/40 text-sm w-5 text-center">{i + 4}</span>
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate">{entry.user?.firstName || 'Участник'}</p>
          </div>
          <span className="text-pink-400 text-sm font-bold">{entry.score}</span>
        </div>
      ))}
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
      {/* Hero */}
      <div className="relative mx-4 mt-4 mb-4 rounded-3xl overflow-hidden px-5 py-5"
        style={{ background: 'linear-gradient(135deg, #1a1200 0%, #2a1f00 40%, #1a1200 100%)', border: '1px solid rgba(234,179,8,0.15)' }}>
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #eab308, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative flex items-center gap-3">
          <Trophy size={32} className="text-yellow-400" fill="currentColor" />
          <div>
            <h1 className="text-xl font-extrabold text-white">Рейтинг</h1>
            <p className="text-yellow-400/60 text-xs">Лучшие фото батлов</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setTab('live')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'live' ? 'text-white' : 'text-white/40'}`}
            style={{ background: tab === 'live' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'none', border: 'none', cursor: 'pointer' }}
          >
            Активные
          </button>
          <button
            onClick={() => setTab('winners')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'winners' ? 'text-black' : 'text-white/40'}`}
            style={{ background: tab === 'winners' ? '#eab308' : 'none', border: 'none', cursor: 'pointer' }}
          >
            <Medal size={13} />
            Победители
          </button>
        </div>
      </div>

      {tab === 'live' && allBattles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 px-4">
          {allBattles.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                current?.id === b.id ? 'text-white' : 'text-white/50'
              }`}
              style={{
                background: current?.id === b.id ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.04)',
                border: current?.id === b.id ? '1px solid rgba(236,72,153,0.5)' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
              }}
            >
              {b.title}
            </button>
          ))}
        </div>
      )}

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
