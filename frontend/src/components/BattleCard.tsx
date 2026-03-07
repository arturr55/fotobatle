import { Timer, Users, Star } from 'lucide-react'
import type { Battle } from '../api/client'

interface Props {
  battle: Battle
  onClick: () => void
}

const CATEGORY_EMOJI: Record<string, string> = {
  look: '😎',
  smile: '😁',
  pet: '🐾',
  hair: '💇',
  art: '🎨',
  landscape: '🌅',
}

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  look: ['#ec4899', '#8b5cf6'],
  smile: ['#f97316', '#ef4444'],
  pet: ['#10b981', '#3b82f6'],
  hair: ['#f59e0b', '#ec4899'],
  art: ['#8b5cf6', '#06b6d4'],
  landscape: ['#06b6d4', '#10b981'],
}

const CARD_BG = '#0d0d1a'

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
  const emoji = CATEGORY_EMOJI[battle.category] || '📸'
  const isActive = battle.status === 'ACTIVE'
  const [g1, g2] = CATEGORY_GRADIENTS[battle.category] || ['#ec4899', '#8b5cf6']

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-3xl cursor-pointer active:scale-95 transition-transform"
      style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Gradient top zone */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: '128px',
          background: `linear-gradient(135deg, ${g1}50, ${g2}40)`,
        }}
      >
        {/* Decorative radial glows */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${g2}60, transparent)`,
            transform: 'translate(40%, -40%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${g1}50, transparent)`,
            transform: 'translate(-40%, 40%)',
          }}
        />

        {/* Category emoji - overlaps the wave below */}
        <span
          className="relative z-10 text-6xl"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))' }}
        >
          {emoji}
        </span>

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

      {/* Wavy SVG separator — dark wave eats into gradient from below */}
      <svg
        viewBox="0 0 390 28"
        preserveAspectRatio="none"
        className="w-full"
        style={{ display: 'block', marginTop: -1 }}
      >
        <path
          d="M0,6 Q50,0 100,16 Q150,28 200,12 Q250,0 300,20 Q345,28 390,10 L390,28 L0,28 Z"
          fill={CARD_BG}
        />
      </svg>

      {/* Dark info zone */}
      <div className="px-4 pb-4 -mt-1">
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
            boxShadow: `0 4px 20px ${g1}55`,
          }}
        >
          {isActive ? '🔥 Голосовать' : '📸 Участвовать'}
        </div>
      </div>
    </div>
  )
}
