import { useBattles } from '../hooks/useBattles'
import BattleCard from '../components/BattleCard'

interface Props {
  onSelectBattle: (id: number) => void
}

export default function BattlesPage({ onSelectBattle }: Props) {
  const { data: battles, isLoading } = useBattles()

  const active = battles?.filter(b => b.status === 'ACTIVE') || []
  const upcoming = battles?.filter(b => b.status === 'UPCOMING') || []

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Hero header */}
      <div className="relative overflow-hidden px-5 pt-8 pb-0"
        style={{ background: 'linear-gradient(135deg, #1e0533 0%, #2d0a4e 40%, #0f1d4e 100%)' }}>
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative pb-8">
          <div className="text-4xl mb-2">📸</div>
          <h1 className="text-3xl font-extrabold text-white mb-1">ФотоБатл</h1>
          <p className="text-white/50 text-sm">Соревнуйся и выигрывай звёзды</p>
        </div>

        {/* Wavy bottom edge of hero */}
        <svg viewBox="0 0 390 32" preserveAspectRatio="none" className="w-full" style={{ display: 'block', marginBottom: -1 }}>
          <path d="M0,8 Q60,0 120,18 Q180,32 240,14 Q300,0 360,20 Q378,26 390,16 L390,32 L0,32 Z" fill="#0f0f0f" />
        </svg>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider px-4 mb-3">
            Активные батлы
          </h2>
          <div className="flex flex-col gap-3 px-4">
            {active.map(b => (
              <BattleCard key={b.id} battle={b} onClick={() => onSelectBattle(b.id)} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-2">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider px-4 mb-3">
            Скоро
          </h2>
          <div className="flex flex-col gap-3 px-4">
            {upcoming.map(b => (
              <BattleCard key={b.id} battle={b} onClick={() => onSelectBattle(b.id)} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && battles?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-white/40">
          <span className="text-5xl mb-4">📸</span>
          <p className="text-lg font-medium">Нет активных батлов</p>
          <p className="text-sm mt-1">Скоро появятся новые!</p>
        </div>
      )}
    </div>
  )
}
