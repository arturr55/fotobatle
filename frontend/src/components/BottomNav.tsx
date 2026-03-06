import { Flame, Trophy, User, Zap } from 'lucide-react'

type Tab = 'battles' | 'vote' | 'top' | 'profile'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const tabs = [
  { id: 'battles' as Tab, icon: Zap, label: 'Батлы' },
  { id: 'vote' as Tab, icon: Flame, label: 'Голосовать' },
  { id: 'top' as Tab, icon: Trophy, label: 'Топ' },
  { id: 'profile' as Tab, icon: User, label: 'Профиль' },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
      style={{ background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="flex">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Icon
                size={22}
                className={isActive ? 'text-pink-500' : 'text-white/40'}
                fill={isActive && tab.id === 'vote' ? 'currentColor' : 'none'}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-pink-500' : 'text-white/40'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
