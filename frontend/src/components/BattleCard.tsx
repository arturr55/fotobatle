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
const LIGHT = '#fcfeff'

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
  const [g1, g2] = CATEGORY_GRADIENTS[battle.category] || ['#8b5cf6', '#06b6d4']

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-3xl cursor-pointer active:scale-95 transition-transform"
      style={{ border: '1px solid rgba(26,22,42,0.1)', background: LIGHT }}
    >
      {/* Dark top zone */}
      <div
        className="relative overflow-hidden"
        style={{
          height: '110px',
          background: DARK,
        }}
      >
        {/* Aurora glow orbs */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 150, height: 150,
            background: `radial-gradient(circle, ${g1}60, transparent 70%)`,
            top: '50%', left: '25%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 110, height: 110,
            background: `radial-gradient(circle, ${g2}55, transparent 70%)`,
            top: '-20%', right: '10%',
          }}
        />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold text-white"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {isActive ? '● Активный' : '○ Скоро'}
          </span>
        </div>

        {/* Prize pool badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(234,179,8,0.2)',
            border: '1px solid rgba(234,179,8,0.4)',
          }}
        >
          <Star size={11} fill="currentColor" className="text-yellow-400" />
          <span className="text-yellow-400 font-bold text-xs">{battle.prizePool}</span>
        </div>
      </div>

      {/* Drip SVG — dark drops into white info zone */}
      <svg
        viewBox="0 0 390 40"
        width="100%"
        height="40"
        preserveAspectRatio="none"
        style={{ display: 'block', marginTop: -1, background: LIGHT }}
      >
        <path
          d="M0,10 H70
             C70,30 93,40 108,40 C123,40 148,30 148,10
             H240
             C240,28 263,36 278,36 C293,36 318,28 318,10
             H390 V0 H0 Z"
          fill={DARK}
        />
      </svg>

      {/* White info zone */}
      <div className="px-4 pb-4 pt-1" style={{ background: LIGHT }}>
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
          <span>{battle.entryFee} монет</span>
        </div>

        {/* CTA Button */}
        <div
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white"
          style={{
            background: `linear-gradient(135deg, ${g1}, ${g2})`,
            boxShadow: `0 4px 20px ${g1}45`,
          }}
        >
          {isActive ? '🔥 Голосовать' : '📸 Участвовать'}
        </div>
      </div>
    </div>
  )
}
