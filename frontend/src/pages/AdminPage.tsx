import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { Battle, WithdrawalRequest } from '../api/client'
import { Plus, CheckCircle, XCircle, Flag } from 'lucide-react'
import WebApp from '@twa-dev/sdk'

const CATEGORIES = [
  { id: 'look', label: '😎 Крутой образ' },
  { id: 'smile', label: '😁 Улыбка' },
  { id: 'pet', label: '🐾 Питомец' },
  { id: 'hair', label: '💇 Причёска' },
  { id: 'art', label: '🎨 Арт / Косплей' },
  { id: 'landscape', label: '🌅 Пейзаж' },
]

function CreateBattleForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'look',
    entryFee: 50,
    startsAt: '',
    endsAt: '',
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

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none"
  const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl mb-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="text-white font-semibold">Новый батл</h3>

      <input className={inputCls} style={inputStyle} placeholder="Название"
        value={form.title} onChange={e => set('title', e.target.value)} />

      <input className={inputCls} style={inputStyle} placeholder="Описание (необязательно)"
        value={form.description} onChange={e => set('description', e.target.value)} />

      <select className={inputCls} style={inputStyle}
        value={form.category} onChange={e => set('category', e.target.value)}>
        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-white/40 text-xs mb-1">Взнос (монет)</p>
          <input type="number" className={inputCls} style={inputStyle}
            value={form.entryFee} onChange={e => set('entryFee', parseInt(e.target.value))} />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-white/40 text-xs mb-1">Старт</p>
          <input type="datetime-local" className={inputCls} style={{ ...inputStyle, colorScheme: 'dark' }}
            value={form.startsAt} onChange={e => set('startsAt', e.target.value)} />
        </div>
        <div className="flex-1">
          <p className="text-white/40 text-xs mb-1">Конец</p>
          <input type="datetime-local" className={inputCls} style={{ ...inputStyle, colorScheme: 'dark' }}
            value={form.endsAt} onChange={e => set('endsAt', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60"
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer' }}>
          Отмена
        </button>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !form.title || !form.startsAt || !form.endsAt}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', cursor: 'pointer' }}>
          {create.isPending ? 'Создаём...' : 'Создать'}
        </button>
      </div>
    </div>
  )
}

function AdminWithdrawals() {
  const queryClient = useQueryClient()

  const { data: withdrawals } = useQuery<(WithdrawalRequest & { user: { telegramId: string; firstName: string; username: string | null } })[]>({
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
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        Заявок на вывод нет
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {withdrawals.map(w => (
        <div key={w.id} className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-medium text-sm">{w.user.firstName}</p>
              <p className="text-white/40 text-xs">
                @{w.user.username || w.user.telegramId} · {w.amount} монет
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => process.mutate({ id: w.id, status: 'PAID' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-green-400"
                style={{ background: 'rgba(74,222,128,0.1)', border: 'none', cursor: 'pointer' }}>
                <CheckCircle size={14} />
                Выплачено
              </button>
              <button
                onClick={() => process.mutate({ id: w.id, status: 'REJECTED', adminNote: 'Отклонено' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400"
                style={{ background: 'rgba(248,113,113,0.1)', border: 'none', cursor: 'pointer' }}>
                <XCircle size={14} />
                Отклонить
              </button>
            </div>
          </div>
          <p className="text-white/30 text-xs">
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
    return <div className="text-center py-8 text-white/30 text-sm">Нет батлов</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {battles.map(b => (
        <div key={b.id} className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-white font-medium text-sm">{b.title}</p>
            <p className="text-white/40 text-xs">
              {b.status} · Пул: {b.prizePool} монет
            </p>
          </div>
          {b.status === 'ACTIVE' && (
            <button
              onClick={() => WebApp.showConfirm('Завершить батл и распределить призы?', (ok) => {
                if (ok) finish.mutate(b.id)
              })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-yellow-400"
              style={{ background: 'rgba(234,179,8,0.1)', border: 'none', cursor: 'pointer' }}>
              <Flag size={14} />
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
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-white mb-4">Админ-панель</h1>

        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 mb-4 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', cursor: 'pointer' }}>
            <Plus size={18} />
            Создать батл
          </button>
        ) : (
          <CreateBattleForm onClose={() => setShowCreate(false)} />
        )}

        <div className="flex gap-2 mb-4">
          {(['battles', 'withdrawals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'text-white' : 'text-white/40'}`}
              style={{
                background: tab === t ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.04)',
                border: tab === t ? '1px solid rgba(236,72,153,0.4)' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer'
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
