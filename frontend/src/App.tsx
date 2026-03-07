import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import BottomNav from './components/BottomNav'
import BattlesPage from './pages/BattlesPage'
import VotePage from './pages/VotePage'
import TopPage from './pages/TopPage'
import ProfilePage from './pages/ProfilePage'
import BattleDetailPage from './pages/BattleDetailPage'
import AdminPage from './pages/AdminPage'
import { useUser } from './hooks/useUser'

type Tab = 'battles' | 'vote' | 'top' | 'profile' | 'admin'

export default function App() {
  const [tab, setTab] = useState<Tab>('battles')
  const [selectedBattleId, setSelectedBattleId] = useState<number | null>(null)
  const { data: user } = useUser()

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()

    const startParam = WebApp.initDataUnsafe?.start_param
    if (startParam?.startsWith('e')) {
      const entryId = parseInt(startParam.slice(1))
      if (!isNaN(entryId)) {
        import('./api/client').then(({ default: api }) => {
          api.get(`/battles/entries/${entryId}`)
            .then(r => setSelectedBattleId(r.data.battleId))
            .catch(() => {})
        })
      }
    }
  }, [])

  if (selectedBattleId) {
    return (
      <div style={{ minHeight: '100vh', background: '#fcfeff' }}>
        <BattleDetailPage battleId={selectedBattleId} onBack={() => setSelectedBattleId(null)} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fcfeff' }}>
      <div className="pb-20">
        {tab === 'battles' && <BattlesPage onSelectBattle={setSelectedBattleId} />}
        {tab === 'vote' && <VotePage />}
        {tab === 'top' && <TopPage />}
        {tab === 'profile' && <ProfilePage />}
        {tab === 'admin' && <AdminPage />}
      </div>
      <BottomNav active={tab} onChange={setTab} isAdmin={!!user?.isAdmin} />
    </div>
  )
}
