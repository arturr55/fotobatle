import { Flame, Trophy, User, Zap, Shield } from 'lucide-react'

type Tab = 'battles' | 'vote' | 'top' | 'profile' | 'admin'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  isAdmin?: boolean
}

const baseTabs = [
  { id: 'battles' as Tab, icon: Zap, label: 'Батлы' },
  { id: 'vote' as Tab, icon: Flame, label: 'Голосовать' },
  { id: 'top' as Tab, icon: Trophy, label: 'Топ' },
  { id: 'profile' as Tab, icon: User, label: 'Профиль' },
]

const adminTab = { id: 'admin' as Tab, icon: Shield, label: 'Админ' }

export default function BottomNav({ active, onChange, isAdmin }: Props) {
  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
      style={{ background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="flex">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = tab.id === active
          const isAdminTab = tab.id === 'admin'
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Icon
                size={22}
                className={isActive ? (isAdminTab ? 'text-yellow-400' : 'text-pink-500') : 'text-white/40'}
              />
              <span className={`text-[10px] font-medium ${isActive ? (isAdminTab ? 'text-yellow-400' : 'text-pink-500') : 'text-white/40'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
