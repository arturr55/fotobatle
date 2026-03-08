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
        <div className="flex items-center gap-4">
          {/* Custom camera + lightning icon */}
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <rect x="5" y="15" width="38" height="26" rx="5" stroke="white" strokeWidth="2.5" />
            <path d="M17 15V11C17 9.9 17.9 9 19 9H29C30.1 9 31 9.9 31 11V15" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="24" cy="28" r="8" stroke="white" strokeWidth="2.5" />
            <path d="M26 22L21 28H24.5L22 34L27 28H23.5L26 22Z" fill="#fe7b11" />
            <circle cx="11" cy="22" r="2" fill="white" />
          </svg>

          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", lineHeight: 1.05 }}>
              <span className="text-white" style={{ fontSize: '2.6rem' }}>Фото </span>
              <span style={{ fontSize: '2.6rem', color: '#fe7b11' }}>Баттл</span>
            </h1>
            <p className="text-white/50 text-sm">Соревнуйся и выигрывай звёзды</p>
          </div>
        </div>
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
            Активные баттлы
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
          <p className="text-lg font-medium" style={{ color: '#1a162a' }}>Нет активных баттлов</p>
          <p className="text-sm mt-1">Скоро появятся новые!</p>
        </div>
      )}
    </div>
  )
}
