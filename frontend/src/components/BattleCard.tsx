import { Timer, Users, Star } from 'lucide-react'
import type { Battle } from '../api/client'

interface Props {
  battle: Battle
  onClick: () => void
}

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  look:      ['#c026d3', '#7c3aed'],
  smile:     ['#f97316', '#ec4899'],
  pet:       ['#06b6d4', '#6366f1'],
  hair:      ['#e879f9', '#ec4899'],
  art:       ['#8b5cf6', '#06b6d4'],
  landscape: ['#10b981', '#06b6d4'],
}

const DARK = '#1a162a'
const LIGHT = '#dad3cd'

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return 'Завершён'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}д ${h % 24}ч`
  if (h > 0) return `${h}ч ${m}м`
  return `${m}м`
}

export default function BattleCard({ battle, onClick }: Props) {
  const isActive = battle.status === 'ACTIVE'
  const hasEntries = (battle._count?.entries ?? 0) > 0
  const [g1, g2] = CATEGORY_GRADIENTS[battle.category] || ['#8b5cf6', '#06b6d4']
  const handleClick = isActive && !hasEntries ? undefined : onClick

  return (
    <div
      onClick={handleClick}
      className={`overflow-hidden rounded-3xl transition-transform ${isActive && !hasEntries ? 'cursor-default opacity-70' : 'cursor-pointer active:scale-95'}`}
      style={{ border: '1px solid rgba(26,22,42,0.1)' }}
    >
      {/* Dark top zone — solid #1a162a */}
      <div
        className="relative flex items-center justify-between px-4 py-4"
        style={{ background: DARK }}
      >
        {/* Status badge */}
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
        >
          {isActive ? '● Активный' : '○ Скоро'}
        </span>

        {/* Prize pool badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(254,123,17,0.18)', border: '1px solid rgba(254,123,17,0.35)' }}
        >
          {battle.prizeType === 'POOL_PERCENT' ? (
            <>
              <Star size={11} fill="#fe7b11" color="#fe7b11" />
              <span className="font-bold text-xs" style={{ color: '#fe7b11' }}>{battle.prizePool}</span>
            </>
          ) : (
            (battle.prizeConfig || []).map((p: any, i: number) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <span className="font-bold text-xs" style={{ color: 'rgba(254,123,17,0.4)' }}>·</span>}
                <Star size={11} fill="#fe7b11" color="#fe7b11" />
                <span className="font-bold text-xs" style={{ color: '#fe7b11' }}>{p.amount}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* White info zone — solid #fcfeff */}
      <div className="px-4 pb-4 pt-3" style={{ background: LIGHT }}>
        <h3 className="font-bold text-lg leading-tight mb-3" style={{ color: DARK }}>
          {battle.title}
        </h3>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>
          <div className="flex items-center gap-1.5">
            <Users size={12} />
            <span>{battle._count?.entries || 0} уч.</span>
          </div>
          <div className="w-px h-3" style={{ background: 'rgba(26,22,42,0.15)' }} />
          <div className="flex items-center gap-1.5">
            <Timer size={12} />
            <span>{isActive ? timeLeft(battle.endsAt) : 'Скоро'}</span>
          </div>
          <div className="w-px h-3" style={{ background: 'rgba(26,22,42,0.15)' }} />
          <span>{battle.entryFee} BS⭐</span>
        </div>

        {/* CTA Button */}
        <div
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white"
          style={{
            background: '#fe7b11',
            boxShadow: '0 4px 20px rgba(254,123,17,0.4)',
          }}
        >
          {isActive && (battle._count?.entries ?? 0) === 0 ? '⏳ Ждём участников' : isActive ? '🔥 Голосовать' : '📸 Участвовать'}
        </div>
      </div>
    </div>
  )
}
