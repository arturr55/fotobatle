import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import BottomNav from './components/BottomNav'
import BattlesPage from './pages/BattlesPage'
import VotePage from './pages/VotePage'
import TopPage from './pages/TopPage'
import ProfilePage from './pages/ProfilePage'
import BattleDetailPage from './pages/BattleDetailPage'

type Tab = 'battles' | 'vote' | 'top' | 'profile'

export default function App() {
  const [tab, setTab] = useState<Tab>('battles')
  const [selectedBattleId, setSelectedBattleId] = useState<number | null>(null)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  const handleSelectBattle = (id: number) => {
    setSelectedBattleId(id)
  }

  const handleBack = () => {
    setSelectedBattleId(null)
  }

  if (selectedBattleId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>
        <BattleDetailPage battleId={selectedBattleId} onBack={handleBack} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      <div className="pb-20">
        {tab === 'battles' && <BattlesPage onSelectBattle={handleSelectBattle} />}
        {tab === 'vote' && <VotePage />}
        {tab === 'top' && <TopPage />}
        {tab === 'profile' && <ProfilePage />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
