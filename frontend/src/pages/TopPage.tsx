import { useState } from 'react'
import { useBattles, useBattle, useFinishedBattles } from '../hooks/useBattles'
import { Star, Medal } from 'lucide-react'
import { mediaUrl } from '../api/client'
import type { Battle } from '../api/client'

const DARK = '#1a162a'
const CARD = '#dad3cd'

function LeaderBoard({ battleId }: { battleId: number }) {
  const { data: battle } = useBattle(battleId)
  const entries = battle?.entries || []

  if (entries.length === 0) {
    return <div className="text-center py-10 text-sm" style={{ color: 'rgba(26,22,42,0.4)' }}>Ещё нет участников</div>
  }

  const [first, ...rest] = entries

  return (
    <div className="flex flex-col gap-3 px-4">
      {/* 1st place */}
      <div className="relative rounded-3xl overflow-hidden" style={{ height: '260px' }}>
        <img src={mediaUrl(first.photoUrl)} alt="" className="w-full h-full object-cover" style={{ objectPosition: '50% 15%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))' }} />
        <div className="absolute top-3 left-3 text-2xl">🥇</div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-bold text-lg">{first.user?.firstName || 'Участник'}</p>
          {first.user?.username && <p className="text-white/60 text-sm">@{first.user.username}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-white/70 text-sm">набрал(а) <b className="text-white">{first.score}</b> очков</span>
            {first.prize ? (
              <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(254,123,17,0.3)', color: '#fe7b11' }}>
                ⭐ +{first.prize} Батл Старс
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2nd and 3rd */}
      {rest.slice(0, 2).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rest.slice(0, 2).map((entry, i) => (
            <div key={entry.id} className="relative rounded-2xl overflow-hidden" style={{ height: '180px' }}>
              <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" style={{ objectPosition: '50% 15%' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))' }} />
              <div className="absolute top-2 left-2 text-xl">{i === 0 ? '🥈' : '🥉'}</div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white font-semibold text-sm truncate">{entry.user?.firstName || 'Участник'}</p>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <b style={{ color: '#fe7b11' }}>{entry.score}</b> очков{entry.prize ? ` · ⭐+${entry.prize}` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rest — compact list */}
      {rest.slice(2).map((entry, i) => (
        <div key={entry.id} className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <span className="text-sm w-5 text-center font-medium" style={{ color: 'rgba(26,22,42,0.4)' }}>{i + 4}</span>
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" style={{ objectPosition: '50% 15%' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate font-medium" style={{ color: DARK }}>{entry.user?.firstName || 'Участник'}</p>
          </div>
          <span className="text-sm font-bold" style={{ color: '#fe7b11' }}>{entry.score}</span>
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
      <div className="flex flex-col items-center justify-center py-16" style={{ color: 'rgba(26,22,42,0.4)' }}>
        <span className="text-5xl mb-4">🏆</span>
        <p>Завершённых батлов пока нет</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4">
      {battles.map((battle: Battle) => (
        <div key={battle.id}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(26,22,42,0.45)' }}>
            {battle.title}
          </p>
          <div className="flex flex-col gap-2">
            {(battle.entries || []).map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
                <div className="w-8 h-8 flex items-center justify-center text-lg flex-shrink-0">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" style={{ objectPosition: '50% 15%' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: DARK }}>{entry.user?.firstName || 'Участник'}</p>
                  {entry.user?.username && <p className="text-xs" style={{ color: 'rgba(26,22,42,0.4)' }}>@{entry.user.username}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                    набрал(а) <b style={{ color: DARK }}>{entry.score}</b> очков
                  </span>
                  {entry.prize != null && entry.prize > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(254,123,17,0.12)' }}>
                      <Star size={11} fill="#fe7b11" color="#fe7b11" />
                      <span className="text-xs font-bold" style={{ color: '#fe7b11' }}>
                        +{entry.prize} Батл Старс
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(battle.entries || []).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(26,22,42,0.35)' }}>Нет данных о победителях</p>
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
  const current = selectedId ? allBattles.find(b => b.id === selectedId) : allBattles[0]

  return (
    <div className="flex flex-col pb-24">
      {/* Hero */}
      <div className="px-5 pt-10 pb-8" style={{ background: DARK }}>
        <div className="flex items-center gap-4">
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <path d="M24 6L28.5 16.5H40L30.5 23L34 34L24 27L14 34L17.5 23L8 16.5H19.5L24 6Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M24 6L28.5 16.5H40L30.5 23L34 34L24 27L14 34L17.5 23L8 16.5H19.5L24 6Z" fill="#fe7b11" fillOpacity="0.25" />
          </svg>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", lineHeight: 1.05 }}>
              <span className="text-white" style={{ fontSize: '2.6rem' }}>Топ </span>
              <span style={{ fontSize: '2.6rem', color: '#fe7b11' }}>Рейтинг</span>
            </h1>
            <p className="text-white/50 text-sm">Лучшие фото батлов</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: CARD }}>
          <button
            onClick={() => setTab('live')}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === 'live' ? DARK : 'transparent',
              color: tab === 'live' ? 'white' : 'rgba(26,22,42,0.5)',
              border: 'none', cursor: 'pointer',
            }}
          >
            Активные
          </button>
          <button
            onClick={() => setTab('winners')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === 'winners' ? '#fe7b11' : 'transparent',
              color: tab === 'winners' ? 'white' : 'rgba(26,22,42,0.5)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Medal size={13} />
            Победители
          </button>
        </div>
      </div>

      {/* Battle selector pills */}
      {tab === 'live' && allBattles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 px-4">
          {allBattles.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: current?.id === b.id ? '#fe7b11' : CARD,
                color: current?.id === b.id ? 'white' : 'rgba(26,22,42,0.6)',
                border: '1px solid rgba(26,22,42,0.12)',
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
          <div className="flex flex-col items-center justify-center py-20" style={{ color: 'rgba(26,22,42,0.4)' }}>
            <span className="text-5xl mb-4">🏆</span>
            <p style={{ color: DARK }}>Нет активных батлов</p>
          </div>
        )
      ) : (
        <WinnersSection />
      )}
    </div>
  )
}
