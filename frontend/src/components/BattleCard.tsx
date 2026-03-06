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

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-3xl cursor-pointer active:scale-95 transition-transform"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{
        background: isActive
          ? 'linear-gradient(90deg, #ec4899, #8b5cf6)'
          : 'linear-gradient(90deg, #eab308, #f97316)'
      }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{emoji}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isActive
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {isActive ? '● Активный' : '○ Скоро'}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg leading-tight">{battle.title}</h3>
          </div>

          {/* Prize pool badge */}
          <div className="flex-shrink-0 ml-3 flex flex-col items-center justify-center rounded-2xl px-3 py-2"
            style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)' }}>
            <div className="flex items-center gap-1 text-yellow-400">
              <Star size={13} fill="currentColor" />
              <span className="font-bold text-base">{battle.prizePool}</span>
            </div>
            <span className="text-yellow-400/60 text-xs">пул</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <Users size={13} />
            <span>{battle._count?.entries || 0} участников</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <Timer size={13} />
            <span>{isActive ? timeLeft(battle.endsAt) : 'Скоро старт'}</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-white/40 text-xs">{battle.entryFee} монет</span>
        </div>

        {/* CTA Button */}
        <div
          className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm text-white"
          style={{
            background: isActive
              ? 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(139,92,246,0.25))'
              : 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(249,115,22,0.2))',
            border: isActive
              ? '1px solid rgba(236,72,153,0.4)'
              : '1px solid rgba(234,179,8,0.3)',
          }}
        >
          {isActive ? '🔥 Голосовать' : '📸 Участвовать'}
        </div>
      </div>
    </div>
  )
}
