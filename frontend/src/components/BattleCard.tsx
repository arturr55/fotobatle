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
      className="relative overflow-hidden rounded-2xl cursor-pointer active:scale-95 transition-transform"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{emoji}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isActive
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {isActive ? 'Активный' : 'Скоро'}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg leading-tight">{battle.title}</h3>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-400">
              <Star size={14} fill="currentColor" />
              <span className="font-bold text-sm">{battle.prizePool}</span>
            </div>
            <span className="text-white/40 text-xs">пул</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-white/50 text-sm">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{battle._count?.entries || 0} участников</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer size={14} />
            <span>{isActive ? timeLeft(battle.endsAt) : 'Скоро старт'}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-white/40 text-xs">Взнос: {battle.entryFee} монет</span>
          <span className="text-pink-400 text-sm font-medium">Участвовать →</span>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: isActive
            ? 'linear-gradient(90deg, #ec4899, #8b5cf6)'
            : 'linear-gradient(90deg, #eab308, #f97316)'
        }}
      />
    </div>
  )
}
