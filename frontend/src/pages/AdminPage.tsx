import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { Battle, WithdrawalRequest } from '../api/client'
import { Plus, CheckCircle, XCircle, Flag, Trash2 } from 'lucide-react'
import WebApp from '@twa-dev/sdk'

const DARK = '#1a162a'
const CARD = '#dad3cd'

const CATEGORIES = [
  { id: 'look',      label: '😎 Крутой образ' },
  { id: 'smile',     label: '😁 Улыбка' },
  { id: 'pet',       label: '🐾 Питомец' },
  { id: 'hair',      label: '💇 Причёска' },
  { id: 'art',       label: '🎨 Арт / Косплей' },
  { id: 'landscape', label: '🌅 Пейзаж' },
]

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(26,22,42,0.15)',
  color: DARK,
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(26,22,42,0.5)',
  marginBottom: 4,
  display: 'block',
}

type PrizeType = 'POOL_PERCENT' | 'FIXED' | 'GIFT'
type PrizePlace = { place: number; percent: number; amount: number; description: string }

const defaultPlaces = (type: PrizeType): PrizePlace[] => {
  if (type === 'POOL_PERCENT') return [
    { place: 1, percent: 50, amount: 0, description: '' },
    { place: 2, percent: 25, amount: 0, description: '' },
    { place: 3, percent: 15, amount: 0, description: '' },
  ]
  if (type === 'FIXED') return [
    { place: 1, percent: 0, amount: 50, description: '' },
    { place: 2, percent: 0, amount: 25, description: '' },
    { place: 3, percent: 0, amount: 10, description: '' },
  ]
  return [
    { place: 1, percent: 0, amount: 0, description: 'Telegram Premium 3 мес.' },
    { place: 2, percent: 0, amount: 0, description: '50 Telegram Stars' },
  ]
}

function CreateBattleForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'look',
    entryFee: 5,
    startsAt: '',
    endsAt: '',
    prizeType: 'POOL_PERCENT' as PrizeType,
    prizeConfig: defaultPlaces('POOL_PERCENT'),
    sponsorPool: 0,
    minParticipants: 2,
  })

  const create = useMutation({
    mutationFn: () => api.post('/battles', form).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] })
      queryClient.invalidateQueries({ queryKey: ['admin-battles'] })
      WebApp.showAlert('Батл создан!')
      onClose()
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const setPrizeType = (type: PrizeType) => setForm(f => ({ ...f, prizeType: type, prizeConfig: defaultPlaces(type) }))

  const updatePlace = (i: number, field: keyof PrizePlace, value: any) => {
    setForm(f => {
      const config = [...f.prizeConfig]
      config[i] = { ...config[i], [field]: value }
      return { ...f, prizeConfig: config }
    })
  }

  const addPlace = () => setForm(f => ({
    ...f,
    prizeConfig: [...f.prizeConfig, { place: f.prizeConfig.length + 1, percent: 0, amount: 0, description: '' }]
  }))

  const removePlace = (i: number) => setForm(f => ({
    ...f,
    prizeConfig: f.prizeConfig.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, place: idx + 1 }))
  }))

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl mb-4"
      style={{ background: CARD, border: '1px solid rgba(26,22,42,0.1)' }}>
      <h3 className="font-semibold" style={{ color: DARK }}>Новый батл</h3>

      <div>
        <label style={labelStyle}>Название</label>
        <input style={inputStyle} placeholder="Название"
          value={form.title} onChange={e => set('title', e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>Описание (необязательно)</label>
        <input style={inputStyle} placeholder="Описание"
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>Категория</label>
        <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label style={labelStyle}>Взнос BS⭐ (0 = бесплатно)</label>
          <input type="number" min={0} style={inputStyle}
            value={form.entryFee} onChange={e => set('entryFee', parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex-1">
          <label style={labelStyle}>Мин. участников</label>
          <input type="number" min={2} style={inputStyle}
            value={form.minParticipants} onChange={e => set('minParticipants', parseInt(e.target.value) || 2)} />
        </div>
      </div>

      {/* Prize type */}
      <div>
        <label style={labelStyle}>Тип приза</label>
        <div className="flex gap-2">
          {(['POOL_PERCENT', 'FIXED', 'GIFT'] as PrizeType[]).map(t => (
            <button key={t} onClick={() => setPrizeType(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: form.prizeType === t ? DARK : 'white',
                color: form.prizeType === t ? 'white' : 'rgba(26,22,42,0.5)',
                border: '1px solid rgba(26,22,42,0.15)', cursor: 'pointer'
              }}>
              {t === 'POOL_PERCENT' ? '% пула' : t === 'FIXED' ? 'Фикс. BS⭐' : '🎁 Подарок'}
            </button>
          ))}
        </div>
      </div>

      {/* Sponsor pool for FIXED */}
      {form.prizeType === 'FIXED' && form.entryFee === 0 && (
        <div>
          <label style={labelStyle}>Бюджет приза BS⭐ (спонсор)</label>
          <input type="number" min={0} style={inputStyle}
            value={form.sponsorPool} onChange={e => set('sponsorPool', parseInt(e.target.value) || 0)} />
        </div>
      )}

      {/* Prize places */}
      <div>
        <label style={labelStyle}>Призовые места</label>
        <div className="flex flex-col gap-2">
          {form.prizeConfig.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-base w-6 flex-shrink-0">{medals[i] || `#${i + 1}`}</span>
              {form.prizeType === 'POOL_PERCENT' && (
                <div className="flex-1 flex items-center gap-1">
                  <input type="number" min={0} max={100} style={{ ...inputStyle, padding: '8px 12px' }}
                    value={p.percent} onChange={e => updatePlace(i, 'percent', parseInt(e.target.value) || 0)} />
                  <span className="text-sm" style={{ color: 'rgba(26,22,42,0.5)' }}>%</span>
                </div>
              )}
              {form.prizeType === 'FIXED' && (
                <div className="flex-1 flex items-center gap-1">
                  <input type="number" min={0} style={{ ...inputStyle, padding: '8px 12px' }}
                    value={p.amount} onChange={e => updatePlace(i, 'amount', parseInt(e.target.value) || 0)} />
                  <span className="text-sm" style={{ color: 'rgba(26,22,42,0.5)' }}>BS⭐</span>
                </div>
              )}
              {form.prizeType === 'GIFT' && (
                <input style={{ ...inputStyle, padding: '8px 12px', flex: 1 }}
                  placeholder="Описание подарка"
                  value={p.description} onChange={e => updatePlace(i, 'description', e.target.value)} />
              )}
              {form.prizeConfig.length > 1 && (
                <button onClick={() => removePlace(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                  <Trash2 size={15} color="rgba(220,38,38,0.7)" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addPlace}
            className="flex items-center gap-1 text-xs py-1.5 px-3 rounded-xl"
            style={{ background: 'rgba(26,22,42,0.06)', border: '1px dashed rgba(26,22,42,0.2)', cursor: 'pointer', color: 'rgba(26,22,42,0.5)' }}>
            <Plus size={12} /> Добавить место
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label style={labelStyle}>Старт</label>
          <input type="datetime-local" style={{ ...inputStyle, colorScheme: 'light' }}
            value={form.startsAt} onChange={e => set('startsAt', e.target.value)} />
        </div>
        <div className="flex-1">
          <label style={labelStyle}>Конец</label>
          <input type="datetime-local" style={{ ...inputStyle, colorScheme: 'light' }}
            value={form.endsAt} onChange={e => set('endsAt', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(26,22,42,0.08)', border: 'none', cursor: 'pointer', color: DARK }}>
          Отмена
        </button>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !form.title || !form.startsAt || !form.endsAt}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}>
          {create.isPending ? 'Создаём...' : 'Создать'}
        </button>
      </div>
    </div>
  )
}

function AdminWithdrawals() {
  const queryClient = useQueryClient()

  const { data: withdrawals } = useQuery<(WithdrawalRequest & {
    user: { telegramId: string; firstName: string; username: string | null }
  })[]>({
    queryKey: ['admin-withdrawals'],
    queryFn: () => api.get('/balance/admin/withdrawals').then(r => r.data),
  })

  const process = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: number; status: string; adminNote?: string }) =>
      api.patch(`/balance/admin/withdrawals/${id}`, { status, adminNote }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] }),
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  if (!withdrawals?.length) {
    return <div className="text-center py-8 text-sm" style={{ color: 'rgba(26,22,42,0.4)' }}>Заявок на вывод нет</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {withdrawals.map(w => (
        <div key={w.id} className="rounded-2xl p-3"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-sm" style={{ color: DARK }}>{w.user.firstName}</p>
              <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                @{w.user.username || w.user.telegramId} · {w.amount} BS⭐
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => process.mutate({ id: w.id, status: 'PAID' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: 'none', cursor: 'pointer' }}>
                <CheckCircle size={13} />
                Выплачено
              </button>
              <button
                onClick={() => process.mutate({ id: w.id, status: 'REJECTED', adminNote: 'Отклонено' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                <XCircle size={13} />
                Отклонить
              </button>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'rgba(26,22,42,0.35)' }}>
            {new Date(w.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  )
}

function AdminBattles() {
  const queryClient = useQueryClient()

  const { data: battles } = useQuery<Battle[]>({
    queryKey: ['admin-battles'],
    queryFn: () => api.get('/battles').then(r => r.data),
  })

  const finish = useMutation({
    mutationFn: (id: number) => api.post(`/battles/${id}/finish`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-battles'] })
      queryClient.invalidateQueries({ queryKey: ['battles'] })
      WebApp.showAlert('Батл завершён, призы распределены!')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  if (!battles?.length) {
    return <div className="text-center py-8 text-sm" style={{ color: 'rgba(26,22,42,0.4)' }}>Нет батлов</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {battles.map(b => (
        <div key={b.id} className="rounded-2xl p-3 flex items-center justify-between"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <div>
            <p className="font-medium text-sm" style={{ color: DARK }}>{b.title}</p>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
              {b.status} · Пул: {b.prizePool} BS⭐
            </p>
          </div>
          {b.status === 'ACTIVE' && (
            <button
              onClick={() => WebApp.showConfirm('Завершить батл и распределить призы?', (ok) => {
                if (ok) finish.mutate(b.id)
              })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(254,123,17,0.15)', color: '#fe7b11', border: 'none', cursor: 'pointer' }}>
              <Flag size={13} />
              Завершить
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'battles' | 'withdrawals'>('battles')

  return (
    <div className="flex flex-col pb-24">
      {/* Hero */}
      <div className="px-5 pt-10 pb-8" style={{ background: DARK }}>
        <div className="flex items-center gap-4">
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <rect x="6" y="10" width="36" height="28" rx="5" stroke="white" strokeWidth="2.5" />
            <path d="M6 18H42" stroke="white" strokeWidth="2.5" />
            <path d="M16 14V10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M32 14V10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M16 27L21 32L32 21" stroke="#fe7b11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", lineHeight: 1.05 }}>
              <span className="text-white" style={{ fontSize: '2.2rem' }}>Админ </span>
              <span style={{ fontSize: '2.2rem', color: '#fe7b11' }}>Панель</span>
            </h1>
            <p className="text-white/50 text-sm">Управление батлами</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {/* Create button */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: '#fe7b11', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(254,123,17,0.35)' }}>
            <Plus size={18} />
            Создать батл
          </button>
        ) : (
          <CreateBattleForm onClose={() => setShowCreate(false)} />
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: CARD }}>
          {(['battles', 'withdrawals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === t ? DARK : 'transparent',
                color: tab === t ? 'white' : 'rgba(26,22,42,0.5)',
                border: 'none', cursor: 'pointer',
              }}>
              {t === 'battles' ? 'Батлы' : 'Выводы'}
            </button>
          ))}
        </div>

        {tab === 'battles' ? <AdminBattles /> : <AdminWithdrawals />}
      </div>
    </div>
  )
}
