import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '../hooks/useUser'
import api, { mediaUrl } from '../api/client'
import type { Transaction, WithdrawalRequest } from '../api/client'
import { Star, Trophy, Wallet, ArrowDownCircle, Clock, PlusCircle, Users, Camera, Megaphone, X, ExternalLink, MessageCircle } from 'lucide-react'
import WebApp from '@twa-dev/sdk'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'

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

const promotionStatusLabel: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_REVIEW:  { label: 'На модерации', bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  PENDING_PAYMENT: { label: 'Ожидает оплаты', bg: 'rgba(254,123,17,0.12)', color: '#fe7b11' },
  ACTIVE:          { label: 'Активен', bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  COMPLETED:       { label: 'Завершён', bg: 'rgba(22,163,74,0.08)', color: '#16a34a' },
  EXPIRED:         { label: 'Истёк срок', bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
  CANCELLED:       { label: 'Отклонён', bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
}

export default function ProfilePage() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositLoading, setDepositLoading] = useState<number | null>(null)
  const [showBuyPanel, setShowBuyPanel] = useState(false)
  const [promoForm, setPromoForm] = useState({ channelUsername: '', targetSubscribers: 100 })
  const [payingPromoId, setPayingPromoId] = useState<number | null>(null)

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

  const { data: priceConfig } = useQuery<{ pricePerSub: number }>({
    queryKey: ['promo-price'],
    queryFn: () => api.get('/promotions/config/price').then(r => r.data),
  })

  const { data: myPromotions } = useQuery<any[]>({
    queryKey: ['my-promotions'],
    queryFn: () => api.get('/promotions/my').then(r => r.data),
  })

  const createPromotion = useMutation({
    mutationFn: (data: { channelUsername: string; targetSubscribers: number }) =>
      api.post('/promotions', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] })
      setPromoForm({ channelUsername: '', targetSubscribers: 100 })
      setShowBuyPanel(false)
      WebApp.showAlert(user?.isAdmin ? 'Канал добавлен и сразу активирован!' : 'Заявка отправлена на модерацию! Мы уведомим вас о решении.')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка'),
  })

  const toggleMessages = useMutation({
    mutationFn: (allowMessages: boolean) =>
      api.patch('/users/me/settings', { allowMessages }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] }),
  })

  const confirmPayment = useMutation({
    mutationFn: ({ id, txHash }: { id: number; txHash: string }) =>
      api.post(`/promotions/${id}/confirm-payment`, { txHash }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-promotions'] })
      setPayingPromoId(null)
      WebApp.showAlert('Оплата подтверждена! Канал активирован.')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка'),
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
      WebApp.showAlert('Минимальная сумма вывода — 10 Баттл Старс')
      return
    }
    if (user && amount > user.balance) {
      WebApp.showAlert(`Недостаточно средств. У тебя ${user.balance} BS⭐`)
      return
    }
    const hasPending = withdrawals?.some(w => w.status === 'PENDING')
    if (hasPending) {
      WebApp.showAlert('У тебя уже есть заявка на вывод в обработке. Дождись её завершения.')
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

  const handleTonPay = async (promo: any) => {
    const platformWallet = import.meta.env.VITE_TON_WALLET
    if (!platformWallet) return WebApp.showAlert('Кошелёк платформы не настроен')
    if (!wallet) {
      tonConnectUI.openModal()
      return
    }
    setPayingPromoId(promo.id)
    try {
      const nanotons = BigInt(Math.round(promo.budgetTon * 1e9)).toString()
      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
          address: platformWallet,
          amount: nanotons,
          payload: btoa(`promotion:${promo.id}`),
        }]
      })
      const txHash = result.boc
      confirmPayment.mutate({ id: promo.id, txHash })
    } catch {
      setPayingPromoId(null)
    }
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
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>Баттл Старс</p>
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
            <p className="text-xs mb-3" style={{ color: 'rgba(26,22,42,0.55)' }}>1 Telegram Star = 1 Баттл Стар. Выбери пакет:</p>
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
                  <span className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>{pkg.coins} Баттл Старс</span>
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
            <p className="text-xs mb-3" style={{ color: 'rgba(26,22,42,0.55)' }}>Минимум 10 Баттл Старс. Срок выплаты: 24-48 часов.</p>
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

        {/* Buy subscribers */}
        <button
          onClick={() => setShowBuyPanel(!showBuyPanel)}
          className="w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: '#0098EA', border: 'none', cursor: 'pointer', color: 'white', boxShadow: '0 4px 20px rgba(0,152,234,0.3)' }}
        >
          <Megaphone size={18} />
          Купить подписчиков на канал
        </button>

        {showBuyPanel && (
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ color: DARK }}>Продвижение канала</h3>
              <button onClick={() => setShowBuyPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} color="rgba(26,22,42,0.4)" />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>
              Ваш канал будет показан участницам баттлов как обязательная подписка для входа.
            </p>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(26,22,42,0.5)' }}>Username канала или группы</label>
              <input
                placeholder="@mychannel"
                value={promoForm.channelUsername}
                onChange={e => setPromoForm(f => ({ ...f, channelUsername: e.target.value }))}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'white', border: '1px solid rgba(26,22,42,0.15)', color: DARK }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(26,22,42,0.5)' }}>Количество подписчиков (мин. 10)</label>
              <input
                type="number"
                min={10}
                value={promoForm.targetSubscribers}
                onChange={e => setPromoForm(f => ({ ...f, targetSubscribers: parseInt(e.target.value) || 10 }))}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'white', border: '1px solid rgba(26,22,42,0.15)', color: DARK }}
              />
            </div>

            {priceConfig && (
              <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(0,152,234,0.08)' }}>
                <span className="text-xs" style={{ color: 'rgba(26,22,42,0.6)' }}>
                  {promoForm.targetSubscribers} × {priceConfig.pricePerSub} TON
                </span>
                <span className="font-bold text-sm" style={{ color: '#0098EA' }}>
                  = {(promoForm.targetSubscribers * priceConfig.pricePerSub).toFixed(4)} TON
                </span>
              </div>
            )}

            <a
              href={`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'photobattletgbot'}?start=addtochannel`}
              target="_blank" rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 no-underline"
              style={{ background: 'rgba(26,22,42,0.06)', color: 'rgba(26,22,42,0.6)', border: '1px dashed rgba(26,22,42,0.2)' }}
            >
              <ExternalLink size={14} />
              Добавить бота в канал (нужно для проверки)
            </a>

            <button
              onClick={() => createPromotion.mutate(promoForm)}
              disabled={createPromotion.isPending || !promoForm.channelUsername || promoForm.targetSubscribers < 10}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: '#0098EA', border: 'none', cursor: 'pointer' }}
            >
              {createPromotion.isPending ? 'Отправляем...' : user?.isAdmin ? 'Добавить бесплатно' : 'Отправить на модерацию'}
            </button>
          </div>
        )}

        {/* My channel promotions */}
        {myPromotions && myPromotions.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Megaphone size={14} style={{ color: '#0098EA' }} />
              <h3 className="text-sm font-semibold" style={{ color: DARK }}>Мои каналы</h3>
            </div>
            <div className="flex flex-col gap-3">
              {myPromotions.map(promo => {
                const s = promotionStatusLabel[promo.status] || { label: promo.status, bg: CARD, color: 'rgba(26,22,42,0.5)' }
                return (
                  <div key={promo.id} className="flex flex-col gap-2 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(26,22,42,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: DARK }}>@{promo.channelUsername}</p>
                        <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                          {promo.subscribedCount} / {promo.targetSubscribers} подписчиков · {promo.budgetTon.toFixed(4)} TON
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </div>

                    {promo.status === 'PENDING_PAYMENT' && (
                      <div className="flex flex-col gap-1">
                        {promo.paymentDeadline && (
                          <p className="text-xs" style={{ color: '#dc2626' }}>
                            Оплатите до {new Date(promo.paymentDeadline).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <button
                          onClick={() => handleTonPay(promo)}
                          disabled={payingPromoId === promo.id || confirmPayment.isPending}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ background: '#0098EA', border: 'none', cursor: 'pointer' }}
                        >
                          {payingPromoId === promo.id ? 'Ожидание...' : `Оплатить ${promo.budgetTon.toFixed(4)} TON`}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
              const botUsername = import.meta.env.VITE_BOT_USERNAME || 'photobattletgbot'
              const link = `https://t.me/${botUsername}/PhotoBattle?startapp=ref${user.id}`
              const text = `Присоединяйся к ФотоБаттл — соревнуйся за фото и выигрывай монеты! 📸🔥`
              WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
            }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#fe7b11', border: 'none', cursor: 'pointer', color: 'white' }}
          >
            <Users size={15} />
            Поделиться реферальной ссылкой
          </button>
        </div>

        {/* Allow messages toggle */}
        <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: user.allowMessages ? 'rgba(0,152,234,0.15)' : 'rgba(26,22,42,0.07)' }}>
                <MessageCircle size={16} style={{ color: user.allowMessages ? '#0098EA' : 'rgba(26,22,42,0.35)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: DARK }}>Открыт для общения</p>
                <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                  {user.allowMessages ? 'Другие могут написать тебе во время голосования' : 'Кнопка "Написать" скрыта от других'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleMessages.mutate(!user.allowMessages)}
              disabled={toggleMessages.isPending}
              className="relative flex-shrink-0"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="w-12 h-6 rounded-full transition-all duration-300"
                style={{ background: user.allowMessages ? '#0098EA' : 'rgba(26,22,42,0.18)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
                  style={{ left: user.allowMessages ? '26px' : '2px' }} />
              </div>
            </button>
          </div>
        </div>

        {/* Battle history */}
        {myEntries && myEntries.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Camera size={14} style={{ color: '#fe7b11' }} />
              <h3 className="text-sm font-semibold" style={{ color: DARK }}>Мои баттлы</h3>
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
                      ) : entry.battle.status === 'ACTIVE' ? '🔥 Голосование идёт'
                        : entry.battle.status === 'UPCOMING' ? '⏳ Скоро старт'
                        : '—'}
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
