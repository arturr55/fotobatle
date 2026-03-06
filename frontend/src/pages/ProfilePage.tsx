import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '../hooks/useUser'
import api from '../api/client'
import type { Transaction, WithdrawalRequest } from '../api/client'
import { Star, Trophy, Wallet, ArrowDownCircle, Clock } from 'lucide-react'
import WebApp from '@twa-dev/sdk'

function TransactionItem({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount > 0
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-white text-sm font-medium">{tx.description || tx.type}</p>
        <p className="text-white/40 text-xs">
          {new Date(tx.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <span className={`font-bold text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{tx.amount}
      </span>
    </div>
  )
}

export default function ProfilePage() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => api.get('/users/me/transactions').then(r => r.data),
  })

  const { data: withdrawals } = useQuery<WithdrawalRequest[]>({
    queryKey: ['withdrawals'],
    queryFn: () => api.get('/balance/withdrawals').then(r => r.data),
  })

  const withdrawMutation = useMutation({
    mutationFn: (amount: number) => api.post('/balance/withdraw', { amount }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
      setWithdrawAmount('')
      setShowWithdraw(false)
      WebApp.showAlert('Заявка на вывод создана! Обработаем в течение 24-48 часов.')
    },
    onError: (err: any) => {
      WebApp.showAlert(err.response?.data?.error || 'Ошибка')
    }
  })

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount)
    if (!amount || amount < 100) {
      WebApp.showAlert('Минимальная сумма вывода — 100 монет')
      return
    }
    withdrawMutation.mutate(amount)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'В обработке', color: 'text-yellow-400 bg-yellow-400/10' },
      PAID: { label: 'Выплачено', color: 'text-green-400 bg-green-400/10' },
      REJECTED: { label: 'Отклонено', color: 'text-red-400 bg-red-400/10' },
    }
    const s = map[status] || { label: status, color: 'text-white/50 bg-white/5' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
  }

  if (!user) return null

  return (
    <div className="flex flex-col pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-white mb-4">Профиль</h1>

        {/* User card */}
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                  {user.firstName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{user.firstName} {user.lastName || ''}</p>
              {user.username && <p className="text-white/50 text-sm">@{user.username}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                <Star size={14} fill="currentColor" />
                <span className="font-bold">{user.balance}</span>
              </div>
              <p className="text-white/40 text-xs">Баланс</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-center gap-1 text-pink-400 mb-1">
                <Trophy size={14} />
                <span className="font-bold">{user.totalWins}</span>
              </div>
              <p className="text-white/40 text-xs">Побед</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                <Wallet size={14} />
                <span className="font-bold">{user.totalEarned}</span>
              </div>
              <p className="text-white/40 text-xs">Заработано</p>
            </div>
          </div>
        </div>

        {/* Withdraw button */}
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
          style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', cursor: 'pointer', color: 'white' }}
        >
          <ArrowDownCircle size={18} />
          Вывести монеты
        </button>

        {showWithdraw && (
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/60 text-xs mb-3">Минимум 100 монет. Срок выплаты: 24-48 часов.</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Сумма"
                min={100}
                max={user.balance}
                className="flex-1 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
              <button
                onClick={handleWithdraw}
                disabled={withdrawMutation.isPending}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: '#ec4899', border: 'none', cursor: 'pointer' }}
              >
                {withdrawMutation.isPending ? '...' : 'OK'}
              </button>
            </div>
          </div>
        )}

        {/* Withdrawal requests */}
        {withdrawals && withdrawals.length > 0 && (
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-white/50" />
              <h3 className="text-white/60 text-sm font-medium">Заявки на вывод</h3>
            </div>
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{w.amount} монет</p>
                  <p className="text-white/40 text-xs">
                    {new Date(w.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {statusBadge(w.status)}
              </div>
            ))}
          </div>
        )}

        {/* Transactions */}
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-white/60 text-sm font-medium mb-3">История транзакций</h3>
          {transactions?.length ? (
            transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)
          ) : (
            <p className="text-white/30 text-sm text-center py-4">Нет транзакций</p>
          )}
        </div>
      </div>
    </div>
  )
}
