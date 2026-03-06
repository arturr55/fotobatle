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
      <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden px-5 py-6"
        style={{ background: 'linear-gradient(135deg, #1e0533 0%, #2d0a4e 40%, #0f1d4e 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative">
          <div className="text-3xl mb-2">📸</div>
          <h1 className="text-2xl font-extrabold text-white mb-1">ФотоБатл</h1>
          <p className="text-white/50 text-sm">Соревнуйся и выигрывай звёзды</p>
        </div>
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
