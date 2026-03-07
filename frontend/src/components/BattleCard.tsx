import { Timer, Users, Star } from 'lucide-react'
import type { Battle } from '../api/client'

interface Props {
  battle: Battle
  onClick: () => void
}

// NICOLAI-inspired: violet, fuchsia, cyan neon palette
const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  look:      ['#c026d3', '#7c3aed'],
  smile:     ['#f97316', '#ec4899'],
  pet:       ['#06b6d4', '#6366f1'],
  hair:      ['#e879f9', '#ec4899'],
  art:       ['#8b5cf6', '#06b6d4'],
  landscape: ['#10b981', '#06b6d4'],
}

const CARD_BG = '#0d0d1f'

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
      style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Gradient top zone — aurora glow, no emoji */}
      <div
        className="relative overflow-hidden"
        style={{
          height: '110px',
          // Fades seamlessly into CARD_BG at bottom — no wave needed
          background: `linear-gradient(160deg, ${g1}55 0%, ${g2}45 55%, ${CARD_BG} 100%)`,
        }}
      >
        {/* Glow orb left */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 140, height: 140,
            background: `radial-gradient(circle, ${g1}70, transparent 70%)`,
            top: '50%', left: '20%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        {/* Glow orb right-top */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 100, height: 100,
            background: `radial-gradient(circle, ${g2}65, transparent 70%)`,
            top: '-20%', right: '15%',
          }}
        />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              isActive ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {isActive ? '● Активный' : '○ Скоро'}
          </span>
        </div>

        {/* Prize pool badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.35)' }}
        >
          <Star size={11} fill="currentColor" className="text-yellow-400" />
          <span className="text-yellow-400 font-bold text-xs">{battle.prizePool}</span>
        </div>
      </div>

      {/* Info zone — seamless continuation of gradient fade */}
      <div className="px-4 pb-4 pt-3">
        <h3 className="text-white font-bold text-lg leading-tight mb-3">{battle.title}</h3>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-4 text-white/40 text-xs">
          <div className="flex items-center gap-1.5">
            <Users size={12} />
            <span>{battle._count?.entries || 0} уч.</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Timer size={12} />
            <span>{isActive ? timeLeft(battle.endsAt) : 'Скоро'}</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span>{battle.entryFee} монет</span>
        </div>

        {/* CTA Button */}
        <div
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white"
          style={{
            background: `linear-gradient(135deg, ${g1}, ${g2})`,
            boxShadow: `0 4px 24px ${g1}55`,
          }}
        >
          {isActive ? '🔥 Голосовать' : '📸 Участвовать'}
        </div>
      </div>
    </div>
  )
}
