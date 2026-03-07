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
    <div className="flex flex-col pb-4">
      {/* Hero */}
      <div className="px-5 pt-10 pb-8" style={{ background: '#1a162a' }}>
        <div className="text-4xl mb-2">📸</div>
        <h1 className="text-3xl font-extrabold text-white mb-1">ФотоБатл</h1>
        <p className="text-white/50 text-sm">Соревнуйся и выигрывай звёзды</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {active.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider px-4 mb-3"
            style={{ color: 'rgba(26,22,42,0.45)' }}>
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
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider px-4 mb-3"
            style={{ color: 'rgba(26,22,42,0.45)' }}>
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
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'rgba(26,22,42,0.4)' }}>
          <span className="text-5xl mb-4">📸</span>
          <p className="text-lg font-medium" style={{ color: '#1a162a' }}>Нет активных батлов</p>
          <p className="text-sm mt-1">Скоро появятся новые!</p>
        </div>
      )}
    </div>
  )
}
