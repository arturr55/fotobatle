import axios from 'axios'
import WebApp from '@twa-dev/sdk'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
})

api.interceptors.request.use((config) => {
  const initData = WebApp.initData
  if (initData) {
    config.headers['x-init-data'] = initData
  }
  return config
})

export default api

export function mediaUrl(url: string): string {
  if (!url || url.startsWith('http') || url.startsWith('data:')) return url
  const base = import.meta.env.VITE_API_URL || ''
  return `${base}${url}`
}

export interface Battle {
  id: number
  title: string
  description: string | null
  category: string
  coverUrl: string | null
  entryFee: number
  minParticipants: number
  prizePool: number
  sponsorPool: number
  prizeType: string
  prizeConfig: any[]
  status: 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED'
  startsAt: string
  endsAt: string
  _count?: { entries: number }
  entries?: BattleEntry[]
}

export interface BattleEntry {
  id: number
  battleId: number
  userId: number
  photoUrl: string
  score: number
  rank: number | null
  prize: number | null
  createdAt: string
  user?: { id: number; username: string | null; firstName: string; avatarUrl: string | null; allowMessages?: boolean }
}

export interface User {
  id: number
  telegramId: string
  username: string | null
  firstName: string
  lastName: string | null
  avatarUrl: string | null
  balance: number
  totalWins: number
  totalEarned: number
  isAdmin: boolean
  allowMessages: boolean
}

export interface Transaction {
  id: number
  type: string
  amount: number
  description: string | null
  createdAt: string
}

export interface WithdrawalRequest {
  id: number
  amount: number
  status: string
  adminNote: string | null
  createdAt: string
  processedAt: string | null
}
