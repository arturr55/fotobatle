import { useBattles } from '../hooks/useBattles'
import BattleCard from '../components/BattleCard'

interface Props {
  onSelectBattle: (id: number) => void
}

// Dark drips dripping down into the white content area
function DripDivider() {
  return (
    <svg
      viewBox="0 0 390 72"
      width="100%"
      height="72"
      preserveAspectRatio="none"
      style={{ display: 'block', marginTop: -1 }}
    >
      <path
        d="M0,14 H28
           C28,42 65,64 75,64 C85,64 122,42 122,14
           H155
           C155,44 192,70 202,70 C212,70 249,44 249,14
           H282
           C282,42 319,62 328,62 C337,62 372,42 372,14
           H390 V0 H0 Z"
        fill="#1a162a"
      />
    </svg>
  )
}

export default function BattlesPage({ onSelectBattle }: Props) {
  const { data: battles, isLoading } = useBattles()

  const active = battles?.filter(b => b.status === 'ACTIVE') || []
  const upcoming = battles?.filter(b => b.status === 'UPCOMING') || []

  return (
    <div className="flex flex-col pb-4">
      {/* Hero — full-width dark header */}
      <div>
        <div
          className="relative overflow-hidden px-5 pt-10 pb-8"
          style={{ background: '#1a162a' }}
        >
          {/* Subtle color accents */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent)',
              transform: 'translate(30%, -30%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-36 h-36 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(236,72,153,0.2), transparent)',
              transform: 'translate(-30%, 30%)',
            }}
          />
          <div className="relative">
            <div className="text-4xl mb-2">📸</div>
            <h1 className="text-3xl font-extrabold text-white mb-1">ФотоБатл</h1>
            <p className="text-white/50 text-sm">Соревнуйся и выигрывай звёзды</p>
          </div>
        </div>

        {/* Drip divider — dark drops into white */}
        <DripDivider />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {active.length > 0 && (
        <div className="mt-2">
          <h2
            className="text-xs font-semibold uppercase tracking-wider px-4 mb-3"
            style={{ color: 'rgba(26,22,42,0.45)' }}
          >
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
          <h2
            className="text-xs font-semibold uppercase tracking-wider px-4 mb-3"
            style={{ color: 'rgba(26,22,42,0.45)' }}
          >
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
