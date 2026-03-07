import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '../hooks/useUser'
import api, { mediaUrl } from '../api/client'
import type { Transaction, WithdrawalRequest } from '../api/client'
import { Star, Trophy, Wallet, ArrowDownCircle, Clock, PlusCircle, Users, Camera } from 'lucide-react'
import WebApp from '@twa-dev/sdk'

const DARK = '#1a162a'
const CARD = '#dad3cd'

function TransactionItem({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount > 0
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(26,22,42,0.08)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: DARK }}>{tx.description || tx.type}</p>
        <p className="text-xs" style={{ color: 'rgba(26,22,42,0.4)' }}>
          {new Date(tx.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <span className={`font-bold text-sm ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
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
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositLoading, setDepositLoading] = useState<number | null>(null)

  const { data: myEntries } = useQuery<any[]>({
    queryKey: ['my-entries'],
    queryFn: () => api.get('/users/me/entries').then(r => r.data),
  })

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
      WebApp.showAlert('Заявка на вывод создана! Обработаем в течение 24-48 часов. Выплата в Telegram Stars.')
    },
    onError: (err: any) => {
      WebApp.showAlert(err.response?.data?.error || 'Ошибка')
    }
  })

  const handleDeposit = async (stars: number) => {
    setDepositLoading(stars)
    try {
      const { data } = await api.post('/balance/create-invoice', { stars })
      WebApp.openInvoice(data.url, (status: string) => {
        if (status === 'paid') {
          queryClient.invalidateQueries({ queryKey: ['user'] })
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
          setShowDeposit(false)
        }
      })
    } catch (err: any) {
      WebApp.showAlert(err.response?.data?.error || 'Ошибка создания счёта')
    } finally {
      setDepositLoading(null)
    }
  }

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount)
    if (!amount || amount < 10) {
      WebApp.showAlert('Минимальная сумма вывода — 10 Батл Старс')
      return
    }
    withdrawMutation.mutate(amount)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      PENDING: { label: 'В обработке', bg: 'rgba(254,123,17,0.12)', color: '#fe7b11' },
      PAID:    { label: 'Выплачено',   bg: 'rgba(22,163,74,0.12)',  color: '#16a34a' },
      REJECTED:{ label: 'Отклонено',   bg: 'rgba(220,38,38,0.12)',  color: '#dc2626' },
    }
    const s = map[status] || { label: status, bg: CARD, color: 'rgba(26,22,42,0.5)' }
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
        {s.label}
      </span>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col pb-24">
      {/* Hero header */}
      <div className="px-5 pt-10 pb-8" style={{ background: DARK }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
            style={{ background: '#fe7b11' }}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {user.firstName[0]}
              </div>
            )}
          </div>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.8rem', lineHeight: 1.1, color: 'white' }}>
              {user.firstName} {user.lastName || ''}
            </h1>
            {user.username && <p className="text-white/50 text-sm">@{user.username}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-3 text-center" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={14} fill="#fe7b11" color="#fe7b11" />
              <span className="font-bold" style={{ color: DARK }}>{user.balance}</span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>Батл Старс</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy size={14} style={{ color: '#fe7b11' }} />
              <span className="font-bold" style={{ color: DARK }}>{user.totalWins}</span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>Побед</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wallet size={14} style={{ color: '#fe7b11' }} />
              <span className="font-bold" style={{ color: DARK }}>{user.totalEarned}</span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>Заработано BS⭐</p>
          </div>
        </div>

        {/* Deposit button */}
        <button
          onClick={() => setShowDeposit(!showDeposit)}
          className="w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: '#fe7b11', border: 'none', cursor: 'pointer', color: 'white', boxShadow: '0 4px 20px rgba(254,123,17,0.35)' }}
        >
          <PlusCircle size={18} />
          Пополнить баланс
        </button>

        {showDeposit && (
          <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <p className="text-xs mb-3" style={{ color: 'rgba(26,22,42,0.55)' }}>1 Telegram Star = 1 Батл Стар. Выбери пакет:</p>
            <div className="grid grid-cols-2 gap-2">
              {[{ stars: 5, coins: 5 }, { stars: 10, coins: 10 }, { stars: 25, coins: 25 }, { stars: 50, coins: 50 }].map(pkg => (
                <button
                  key={pkg.stars}
                  onClick={() => handleDeposit(pkg.stars)}
                  disabled={depositLoading !== null}
                  className="py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex flex-col items-center gap-1"
                  style={{ background: 'white', border: '1px solid rgba(26,22,42,0.1)', cursor: 'pointer' }}
                >
                  <span style={{ color: '#fe7b11' }}>{depositLoading === pkg.stars ? '...' : `⭐ ${pkg.stars} Stars`}</span>
                  <span className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>{pkg.coins} Батл Старс</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Withdraw button */}
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: DARK, border: 'none', cursor: 'pointer', color: 'white' }}
        >
          <ArrowDownCircle size={18} />
          Вывести монеты
        </button>

        {showWithdraw && (
          <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <p className="text-xs mb-3" style={{ color: 'rgba(26,22,42,0.55)' }}>Минимум 10 Батл Старс. Срок выплаты: 24-48 часов.</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Сумма"
                min={100}
                max={user.balance}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'white', border: '1px solid rgba(26,22,42,0.15)', color: DARK }}
              />
              <button
                onClick={handleWithdraw}
                disabled={withdrawMutation.isPending}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}
              >
                {withdrawMutation.isPending ? '...' : 'OK'}
              </button>
            </div>
          </div>
        )}

        {/* Withdrawal requests */}
        {withdrawals && withdrawals.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: 'rgba(26,22,42,0.45)' }} />
              <h3 className="text-sm font-medium" style={{ color: 'rgba(26,22,42,0.6)' }}>Заявки на вывод</h3>
            </div>
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(26,22,42,0.08)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: DARK }}>{w.amount} монет</p>
                  <p className="text-xs" style={{ color: 'rgba(26,22,42,0.4)' }}>
                    {new Date(w.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {statusBadge(w.status)}
              </div>
            ))}
          </div>
        )}

        {/* Referral */}
        <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} style={{ color: '#fe7b11' }} />
            <h3 className="text-sm font-semibold" style={{ color: DARK }}>Пригласи друга — получи 2 голоса</h3>
          </div>
          <div className="flex gap-4 mb-3">
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>
              Приглашено: <b style={{ color: DARK }}>{(user as any).referralCount ?? 0}</b>
            </p>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>
              Бонусных голосов: <b style={{ color: '#fe7b11' }}>{(user as any).bonusVotes ?? 0}</b>
            </p>
          </div>
          <button
            onClick={() => {
              const botUsername = import.meta.env.VITE_BOT_USERNAME || 'photobatletgBot'
              const link = `https://t.me/${botUsername}/PhotoBatle?startapp=ref${user.id}`
              const text = `Присоединяйся к ФотоБатл — соревнуйся за фото и выигрывай монеты! 📸🔥`
              WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
            }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#fe7b11', border: 'none', cursor: 'pointer', color: 'white' }}
          >
            <Users size={15} />
            Поделиться реферальной ссылкой
          </button>
        </div>

        {/* Battle history */}
        {myEntries && myEntries.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Camera size={14} style={{ color: '#fe7b11' }} />
              <h3 className="text-sm font-semibold" style={{ color: DARK }}>Мои батлы</h3>
            </div>
            <div className="flex flex-col gap-2">
              {myEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" style={{ objectPosition: '50% 15%' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: DARK }}>{entry.battle.title}</p>
                    <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                      {entry.battle.status === 'FINISHED' ? (
                        entry.rank ? `${['🥇','🥈','🥉'][entry.rank - 1] || `#${entry.rank}`} место · +${entry.prize ?? 0} BS⭐` : 'Не в топ-3'
                      ) : entry.battle.status === 'ACTIVE' ? '🔥 Голосование идёт' : '⏳ Скоро старт'}
                    </p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: '#fe7b11' }}>{entry.score} оч.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'rgba(26,22,42,0.6)' }}>История транзакций</h3>
          {transactions?.length ? (
            transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'rgba(26,22,42,0.35)' }}>Нет транзакций</p>
          )}
        </div>
      </div>
    </div>
  )
}
