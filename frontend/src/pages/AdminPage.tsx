import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { Battle, WithdrawalRequest } from '../api/client'
import { Plus, CheckCircle, XCircle, Flag, Trash2, Megaphone, Settings, Pencil, X } from 'lucide-react'
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
    channelQueue: [] as number[],
  })

  const { data: activeChannels } = useQuery<any[]>({
    queryKey: ['active-promotions'],
    queryFn: () => api.get('/promotions/active').then(r => r.data),
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

      {/* Channel queue */}
      {activeChannels && activeChannels.length > 0 && (
        <div>
          <label style={labelStyle}>Очередь каналов для подписки (необязательно)</label>
          <div className="flex flex-col gap-1.5">
            {activeChannels.map(ch => {
              const idx = form.channelQueue.indexOf(ch.id)
              const selected = idx !== -1
              return (
                <button key={ch.id}
                  onClick={() => setForm(f => ({
                    ...f,
                    channelQueue: selected
                      ? f.channelQueue.filter(id => id !== ch.id)
                      : [...f.channelQueue, ch.id]
                  }))}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: selected ? 'rgba(0,152,234,0.12)' : 'white',
                    border: selected ? '1px solid rgba(0,152,234,0.4)' : '1px solid rgba(26,22,42,0.12)',
                    cursor: 'pointer', color: DARK
                  }}>
                  <span>@{ch.channelUsername}</span>
                  <span className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                    {selected ? `#${idx + 1} в очереди` : `${ch.subscribedCount}/${ch.targetSubscribers}`}
                  </span>
                </button>
              )
            })}
            {form.channelQueue.length > 0 && (
              <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                Порядок: {form.channelQueue.map((id, i) => {
                  const ch = activeChannels.find(c => c.id === id)
                  return `${i + 1}. @${ch?.channelUsername}`
                }).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

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
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<any>(null)

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

  const edit = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/battles/${id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-battles'] })
      queryClient.invalidateQueries({ queryKey: ['battles'] })
      setEditingId(null)
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  const deleteBattle = useMutation({
    mutationFn: (id: number) => api.delete(`/battles/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-battles'] })
      queryClient.invalidateQueries({ queryKey: ['battles'] })
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  const startEdit = (b: any) => {
    const toLocal = (iso: string) => {
      const d = new Date(iso)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setEditForm({
      title: b.title,
      description: b.description || '',
      category: b.category,
      entryFee: b.entryFee,
      minParticipants: b.minParticipants,
      startsAt: toLocal(b.startsAt),
      endsAt: toLocal(b.endsAt),
    })
    setEditingId(b.id)
  }

  const statusLabel: Record<string, string> = {
    UPCOMING: 'Скоро', ACTIVE: 'Идёт', FINISHED: 'Завершён', CANCELLED: 'Отменён'
  }
  const statusColor: Record<string, string> = {
    UPCOMING: '#fe7b11', ACTIVE: '#16a34a', FINISHED: 'rgba(26,22,42,0.4)', CANCELLED: '#dc2626'
  }

  if (!battles?.length) {
    return <div className="text-center py-8 text-sm" style={{ color: 'rgba(26,22,42,0.4)' }}>Нет батлов</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {battles.map(b => (
        <div key={b.id} className="rounded-2xl overflow-hidden"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>

          {/* Battle row */}
          <div className="flex items-center justify-between p-3">
            <div className="flex-1 min-w-0 mr-2">
              <p className="font-medium text-sm truncate" style={{ color: DARK }}>{b.title}</p>
              <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                <span style={{ color: statusColor[b.status] || 'rgba(26,22,42,0.4)', fontWeight: 600 }}>
                  {statusLabel[b.status] || b.status}
                </span>
                {' · '}{b._count?.entries ?? 0} уч. · {b.prizePool} BS⭐
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {b.status !== 'FINISHED' && b.status !== 'CANCELLED' && (
                <button
                  onClick={() => editingId === b.id ? setEditingId(null) : startEdit(b)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: editingId === b.id ? DARK : 'rgba(26,22,42,0.08)', border: 'none', cursor: 'pointer' }}>
                  {editingId === b.id
                    ? <X size={13} color="white" />
                    : <Pencil size={13} color="rgba(26,22,42,0.6)" />}
                </button>
              )}
              {b.status === 'ACTIVE' && (
                <button
                  onClick={() => WebApp.showConfirm('Завершить батл и распределить призы?', ok => { if (ok) finish.mutate(b.id) })}
                  className="flex items-center gap-1 px-2.5 h-8 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(254,123,17,0.15)', color: '#fe7b11', border: 'none', cursor: 'pointer' }}>
                  <Flag size={12} />
                  Завершить
                </button>
              )}
              {(b.status === 'UPCOMING' || b.status === 'FINISHED' || b.status === 'CANCELLED') && (
                <button
                  onClick={() => WebApp.showConfirm(
                    b.entryFee > 0 && (b._count?.entries ?? 0) > 0
                      ? `Удалить "${b.title}"? Взносы будут возвращены участникам.`
                      : `Удалить "${b.title}"?`,
                    ok => { if (ok) deleteBattle.mutate(b.id) }
                  )}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(220,38,38,0.1)', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={13} color="#dc2626" />
                </button>
              )}
            </div>
          </div>

          {/* Inline edit form */}
          {editingId === b.id && editForm && (
            <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(26,22,42,0.08)' }}>
              <div className="h-2" />
              <div>
                <label style={labelStyle}>Название</label>
                <input style={inputStyle} value={editForm.title}
                  onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Описание</label>
                <input style={inputStyle} value={editForm.description}
                  onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Категория</label>
                <select style={inputStyle} value={editForm.category}
                  onChange={e => setEditForm((f: any) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label style={labelStyle}>Взнос BS⭐</label>
                  <input type="number" min={0} style={inputStyle} value={editForm.entryFee}
                    onChange={e => setEditForm((f: any) => ({ ...f, entryFee: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Мин. участников</label>
                  <input type="number" min={2} style={inputStyle} value={editForm.minParticipants}
                    onChange={e => setEditForm((f: any) => ({ ...f, minParticipants: parseInt(e.target.value) || 2 }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label style={labelStyle}>Старт</label>
                  <input type="datetime-local" style={{ ...inputStyle, colorScheme: 'light' }} value={editForm.startsAt}
                    onChange={e => setEditForm((f: any) => ({ ...f, startsAt: e.target.value }))} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Конец</label>
                  <input type="datetime-local" style={{ ...inputStyle, colorScheme: 'light' }} value={editForm.endsAt}
                    onChange={e => setEditForm((f: any) => ({ ...f, endsAt: e.target.value }))} />
                </div>
              </div>
              <button
                onClick={() => edit.mutate({ id: b.id, data: editForm })}
                disabled={edit.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}>
                {edit.isPending ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AdminChannels() {
  const queryClient = useQueryClient()
  const [newPrice, setNewPrice] = useState('')

  const { data: pending } = useQuery<any[]>({
    queryKey: ['admin-pending-promos'],
    queryFn: () => api.get('/promotions/admin/pending').then(r => r.data),
  })

  const { data: priceConfig } = useQuery<{ pricePerSub: number }>({
    queryKey: ['promo-price'],
    queryFn: () => api.get('/promotions/config/price').then(r => r.data),
  })

  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/promotions/${id}/approve`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-promos'] })
      WebApp.showAlert('Одобрено! Владелец канала получит уведомление с инвойсом.')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка'),
  })

  const cancel = useMutation({
    mutationFn: (id: number) => api.post(`/promotions/${id}/cancel`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-promos'] }),
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка'),
  })

  const setPrice = useMutation({
    mutationFn: (price: string) => api.post('/promotions/config/price', { price }).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['promo-price'] })
      setNewPrice('')
      WebApp.showAlert(`Цена установлена: ${data.pricePerSub} TON за подписчика`)
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка'),
  })

  const statusLabel: Record<string, string> = {
    PENDING_REVIEW: 'На модерации',
    PENDING_PAYMENT: 'Ожидает оплаты',
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Price config */}
      <div className="rounded-2xl p-3" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Settings size={13} style={{ color: 'rgba(26,22,42,0.45)' }} />
          <p className="text-xs font-medium" style={{ color: 'rgba(26,22,42,0.6)' }}>
            Цена за подписчика: <b style={{ color: DARK }}>{priceConfig?.pricePerSub ?? '...'} TON</b>
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.001"
            placeholder="Новая цена TON"
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'white', border: '1px solid rgba(26,22,42,0.15)', color: DARK }}
          />
          <button
            onClick={() => setPrice.mutate(newPrice)}
            disabled={setPrice.isPending || !newPrice}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: '#0098EA', border: 'none', cursor: 'pointer' }}
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Pending promotions */}
      {!pending?.length ? (
        <div className="text-center py-8 text-sm" style={{ color: 'rgba(26,22,42,0.4)' }}>
          Нет заявок на модерацию
        </div>
      ) : (
        pending.map(p => (
          <div key={p.id} className="rounded-2xl p-3" style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm" style={{ color: DARK }}>@{p.channelUsername}</p>
                <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>
                  {p.owner.firstName} {p.owner.username ? `@${p.owner.username}` : ''} · {p.targetSubscribers} подписчиков
                </p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: '#0098EA' }}>
                  {p.budgetTon.toFixed(4)} TON
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.12)', color: '#64748b' }}>
                {statusLabel[p.status] || p.status}
              </span>
            </div>
            {p.status === 'PENDING_REVIEW' && (
              <div className="flex gap-2">
                <button
                  onClick={() => WebApp.showConfirm(`Одобрить @${p.channelUsername}?`, ok => { if (ok) approve.mutate(p.id) })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: 'none', cursor: 'pointer' }}>
                  <CheckCircle size={13} /> Одобрить
                </button>
                <button
                  onClick={() => cancel.mutate(p.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                  <XCircle size={13} /> Отклонить
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default function AdminPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'battles' | 'withdrawals' | 'channels'>('battles')

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
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: CARD }}>
          {(['battles', 'channels', 'withdrawals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: tab === t ? DARK : 'transparent',
                color: tab === t ? 'white' : 'rgba(26,22,42,0.5)',
                border: 'none', cursor: 'pointer',
              }}>
              {t === 'battles' ? 'Батлы' : t === 'channels' ? 'Каналы' : 'Выводы'}
            </button>
          ))}
        </div>

        {tab === 'battles' && <AdminBattles />}
        {tab === 'channels' && <AdminChannels />}
        {tab === 'withdrawals' && <AdminWithdrawals />}
      </div>
    </div>
  )
}
