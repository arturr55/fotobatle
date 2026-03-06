import { useBattles } from '../hooks/useBattles'
import BattleCard from '../components/BattleCard'
import { Zap } from 'lucide-react'

interface Props {
  onSelectBattle: (id: number) => void
}

export default function BattlesPage({ onSelectBattle }: Props) {
  const { data: battles, isLoading } = useBattles()

  const active = battles?.filter(b => b.status === 'ACTIVE') || []
  const upcoming = battles?.filter(b => b.status === 'UPCOMING') || []

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-pink-500" fill="currentColor" />
          <h1 className="text-xl font-bold text-white">ФотоБатл</h1>
        </div>
        <p className="text-white/50 text-sm">Соревнуйся и выигрывай звёзды</p>
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
