import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { ArrowLeft, Camera, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import api, { mediaUrl } from '../api/client'
import { useUser } from '../hooks/useUser'
import WebApp from '@twa-dev/sdk'

const DARK = '#1a162a'
const CARD = '#dad3cd'

const TON_WALLET = import.meta.env.VITE_TON_WALLET || ''

type PrizePlace = { place: number; amount: number; description: string }

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    }
    img.onerror = reject
    img.src = url
  })
}

// ──────────────────────── Task Detail ────────────────────────
function TaskDetail({ taskId, onBack }: { taskId: number; onBack: () => void }) {
  const { data: task, refetch } = useQuery<any>({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then(r => r.data)
  })
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [subChecked, setSubChecked] = useState(false)
  const [checking, setChecking] = useState(false)

  const enterTask = useMutation({
    mutationFn: async (photo: File) => {
      const photoData = await compressImage(photo)
      return api.post(`/tasks/${taskId}/enter`, { photo: photoData }).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      setPreview(null)
      setSelectedFile(null)
      WebApp.showAlert('Ты участвуешь в задании! 🎉')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  const voteEntry = useMutation({
    mutationFn: ({ entryId, reaction }: { entryId: number; reaction: string }) =>
      api.post(`/tasks/entries/${entryId}/vote`, { reaction }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    }
  })

  if (!task) return (
    <div className="flex justify-center py-20" style={{ background: '#fcfeff', minHeight: '100vh' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#fe7b11', borderTopColor: 'transparent' }} />
    </div>
  )

  const myEntry = task.entries?.find((e: any) => e.userId === user?.id)

  const checkSubscription = async () => {
    setChecking(true)
    try {
      const { data } = await api.get(`/tasks/check-sub/${task.channelUsername}`)
      if (data.isSubscribed) {
        setSubChecked(true)
      } else {
        WebApp.showAlert(`Ты не подписан на @${task.channelUsername}. Подпишись и попробуй снова.`)
      }
    } catch {
      WebApp.showAlert('Ошибка проверки подписки')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col pb-24" style={{ background: '#fcfeff', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-6" style={{ background: DARK }}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="white" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1 truncate"
            style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.3rem' }}>
            {task.title}
          </h1>
        </div>
        <p className="text-white/50 text-sm mt-2 ml-12">
          Подпишись на <span className="text-[#fe7b11] font-semibold">@{task.channelUsername}</span> и участвуй
        </p>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Prize config */}
        {(task.prizeConfig as PrizePlace[])?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: CARD }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'rgba(26,22,42,0.45)' }}>Призы</p>
            {(task.prizeConfig as PrizePlace[]).map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-base">{['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</span>
                <span className="text-sm font-bold" style={{ color: '#fe7b11' }}>
                  {p.amount ? `${p.amount} BS⭐` : p.description || '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Enter section */}
        {!myEntry && task.status === 'ACTIVE' && (
          <div className="rounded-2xl p-4" style={{ background: CARD }}>
            <h3 className="font-semibold mb-3" style={{ color: DARK }}>Участвовать</h3>

            {!subChecked ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm" style={{ color: 'rgba(26,22,42,0.6)' }}>
                  Сначала подпишись на канал <b>@{task.channelUsername}</b>, затем нажми "Проверить подписку"
                </p>
                <button
                  onClick={() => WebApp.openTelegramLink(`https://t.me/${task.channelUsername}`)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#229ED9', border: 'none', cursor: 'pointer' }}>
                  Открыть @{task.channelUsername}
                </button>
                <button
                  onClick={checkSubscription}
                  disabled={checking}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'rgba(26,22,42,0.08)', border: 'none', cursor: 'pointer', color: DARK }}>
                  {checking ? 'Проверяем...' : '✓ Проверить подписку'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: '#16a34a' }}>
                  <CheckCircle size={16} />
                  Подписка подтверждена!
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="user"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setSelectedFile(f); setPreview(URL.createObjectURL(f)) }
                  }} className="hidden" />
                {preview ? (
                  <>
                    <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setPreview(null); setSelectedFile(null) }}
                        className="flex-1 py-2.5 rounded-xl text-sm"
                        style={{ background: 'rgba(26,22,42,0.08)', border: 'none', cursor: 'pointer', color: DARK }}>
                        Сменить
                      </button>
                      <button onClick={() => selectedFile && enterTask.mutate(selectedFile)}
                        disabled={enterTask.isPending}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}>
                        {enterTask.isPending ? 'Загрузка...' : 'Участвовать'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}>
                    <Camera size={18} /> Загрузить фото
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* My entry */}
        {myEntry && (
          <div className="rounded-2xl p-3" style={{ background: CARD, border: '1px solid rgba(254,123,17,0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <img src={mediaUrl(myEntry.photoUrl)} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#fe7b11' }}>Ты участвуешь!</p>
                <p className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>
                  {myEntry.score} BS⭐ · {myEntry.rank ? `#${myEntry.rank}` : 'без ранга'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Entries grid */}
        {task.entries?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'rgba(26,22,42,0.45)' }}>
              Участники · {task.entries.length}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {task.entries.map((entry: any, i: number) => {
                const hasVoted = entry.votes?.length > 0
                return (
                  <div key={entry.id} className="relative rounded-2xl overflow-hidden"
                    style={{ aspectRatio: '3/4' }}>
                    <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover"
                      style={{ objectPosition: '50% 15%' }} />
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.85) 100%)' }} />
                    {i < 3 && <span className="absolute top-2 left-2 text-lg">{['🥇', '🥈', '🥉'][i]}</span>}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-semibold truncate">{entry.user?.firstName}</p>
                      <p className="text-xs font-bold" style={{ color: '#fe7b11' }}>{entry.score} BS⭐</p>
                      {entry.userId !== user?.id && task.status === 'ACTIVE' && (
                        <button
                          onClick={() => !hasVoted && voteEntry.mutate({ entryId: entry.id, reaction: 'fire' })}
                          disabled={hasVoted}
                          className="mt-1 w-full py-1 rounded-lg text-xs font-semibold disabled:opacity-40"
                          style={{ background: hasVoted ? 'rgba(255,255,255,0.2)' : '#fe7b11', border: 'none', cursor: hasVoted ? 'default' : 'pointer', color: 'white' }}>
                          {hasVoted ? '✓ Оценено' : '🔥 Оценить'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────── Create Task Form ────────────────────────
function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const [step, setStep] = useState<'form' | 'pay' | 'done'>('form')
  const [taskId, setTaskId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    channelUsername: '',
    budget: 1,
    endsAt: '',
    minParticipants: 2,
    prizeConfig: [
      { place: 1, amount: 50, description: '' },
      { place: 2, amount: 25, description: '' },
      { place: 3, amount: 10, description: '' },
    ] as PrizePlace[]
  })

  const createTask = useMutation({
    mutationFn: () => api.post('/tasks', form).then(r => r.data),
    onSuccess: (data) => {
      setTaskId(data.id)
      setStep('pay')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  const confirmPayment = useMutation({
    mutationFn: (txHash: string) => api.post(`/tasks/${taskId}/confirm-payment`, { txHash }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setStep('done')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  const handlePay = async () => {
    if (!TON_WALLET) {
      WebApp.showAlert('TON кошелёк платформы не настроен. Обратитесь к администратору.')
      return
    }
    try {
      if (!wallet) await tonConnectUI.connectWallet()
      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{
          address: TON_WALLET,
          amount: String(Math.floor(form.budget * 1e9)),
          payload: btoa(`task:${taskId}`)
        }]
      })
      await confirmPayment.mutateAsync(result.boc)
    } catch {
      WebApp.showAlert('Оплата отменена или произошла ошибка')
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'white', border: '1px solid rgba(26,22,42,0.15)', color: DARK,
    borderRadius: 12, padding: '10px 16px', fontSize: 14, width: '100%', outline: 'none'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: 'rgba(26,22,42,0.5)', marginBottom: 4, display: 'block'
  }

  if (step === 'done') return (
    <div className="rounded-2xl p-6 text-center mb-4" style={{ background: CARD }}>
      <span className="text-5xl mb-4 block">✅</span>
      <p className="font-bold text-lg mb-1" style={{ color: DARK }}>Задание создано!</p>
      <p className="text-sm mb-4" style={{ color: 'rgba(26,22,42,0.5)' }}>Ожидает проверки администратором</p>
      <button onClick={onClose}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}>
        Закрыть
      </button>
    </div>
  )

  if (step === 'pay') return (
    <div className="rounded-2xl p-4 mb-4 flex flex-col gap-4" style={{ background: CARD }}>
      <h3 className="font-semibold" style={{ color: DARK }}>Оплата заданияTON</h3>
      <div className="rounded-xl p-3" style={{ background: 'white' }}>
        <p className="text-sm" style={{ color: 'rgba(26,22,42,0.5)' }}>Сумма</p>
        <p className="text-2xl font-bold" style={{ color: DARK }}>{form.budget} TON</p>
      </div>
      <p className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>
        Подключи TON кошелёк и отправь оплату. После подтверждения задание будет активировано администратором.
      </p>
      <button onClick={handlePay}
        disabled={confirmPayment.isPending}
        className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
        style={{ background: '#0098EA', border: 'none', cursor: 'pointer' }}>
        {wallet ? `💎 Оплатить ${form.budget} TON` : '🔗 Подключить кошелёк и оплатить'}
      </button>
      <button onClick={() => confirmPayment.mutate('manual')}
        className="text-xs text-center"
        style={{ color: 'rgba(26,22,42,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Оплатил вручную — подтвердить
      </button>
    </div>
  )

  return (
    <div className="rounded-2xl p-4 mb-4 flex flex-col gap-3" style={{ background: CARD }}>
      <h3 className="font-semibold" style={{ color: DARK }}>Новое задание</h3>

      <div>
        <label style={labelStyle}>Название задания</label>
        <input style={inputStyle} placeholder="Например: Лучшее фото лета"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>

      <div>
        <label style={labelStyle}>Канал/группа (без @)</label>
        <input style={inputStyle} placeholder="mychannel"
          value={form.channelUsername} onChange={e => setForm(f => ({ ...f, channelUsername: e.target.value.replace('@', '') }))} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label style={labelStyle}>Бюджет (TON)</label>
          <input type="number" min={0.1} step={0.1} style={inputStyle}
            value={form.budget} onChange={e => setForm(f => ({ ...f, budget: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="flex-1">
          <label style={labelStyle}>Мин. участников</label>
          <input type="number" min={2} style={inputStyle}
            value={form.minParticipants} onChange={e => setForm(f => ({ ...f, minParticipants: parseInt(e.target.value) || 2 }))} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Конец приёма</label>
        <input type="datetime-local" style={{ ...inputStyle, colorScheme: 'light' }}
          value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
      </div>

      {/* Prizes */}
      <div>
        <label style={labelStyle}>Призы (BS⭐ или описание)</label>
        {form.prizeConfig.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-base w-6">{['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</span>
            <input type="number" min={0} placeholder="BS⭐"
              style={{ ...inputStyle, padding: '8px 10px', flex: 1 }}
              value={p.amount}
              onChange={e => {
                const c = [...form.prizeConfig]
                c[i] = { ...c[i], amount: parseInt(e.target.value) || 0 }
                setForm(f => ({ ...f, prizeConfig: c }))
              }} />
            <input placeholder="или описание"
              style={{ ...inputStyle, padding: '8px 10px', flex: 2 }}
              value={p.description}
              onChange={e => {
                const c = [...form.prizeConfig]
                c[i] = { ...c[i], description: e.target.value }
                setForm(f => ({ ...f, prizeConfig: c }))
              }} />
            {form.prizeConfig.length > 1 && (
              <button onClick={() => setForm(f => ({ ...f, prizeConfig: f.prizeConfig.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, place: idx + 1 })) }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Trash2 size={14} color="rgba(220,38,38,0.7)" />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setForm(f => ({ ...f, prizeConfig: [...f.prizeConfig, { place: f.prizeConfig.length + 1, amount: 0, description: '' }] }))}
          className="flex items-center gap-1 text-xs py-1.5 px-3 rounded-xl"
          style={{ background: 'rgba(26,22,42,0.06)', border: '1px dashed rgba(26,22,42,0.2)', cursor: 'pointer', color: 'rgba(26,22,42,0.5)' }}>
          <Plus size={12} /> Добавить место
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(26,22,42,0.08)', border: 'none', cursor: 'pointer', color: DARK }}>
          Отмена
        </button>
        <button onClick={() => createTask.mutate()}
          disabled={createTask.isPending || !form.title || !form.channelUsername || !form.endsAt}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}>
          {createTask.isPending ? 'Создаём...' : 'Далее →'}
        </button>
      </div>
    </div>
  )
}

// ──────────────────────── Tasks Page ────────────────────────
export default function TasksPage() {
  const { data: tasks } = useQuery<any[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data)
  })
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  if (selectedTaskId) {
    return <TaskDetail taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Hero */}
      <div className="px-5 pt-10 pb-8" style={{ background: DARK }}>
        <div className="flex items-center gap-4">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="8" width="36" height="32" rx="5" stroke="white" strokeWidth="2.5" />
            <path d="M14 18H34" stroke="#fe7b11" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 25H28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5" />
            <path d="M14 32H22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.3" />
          </svg>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", lineHeight: 1.05 }}>
              <span className="text-white" style={{ fontSize: '2.4rem' }}>Задания</span>
            </h1>
            <p className="text-white/50 text-sm">Подпишись и выиграй</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {!showCreate ? (
          <button onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: '#0098EA', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,152,234,0.35)' }}>
            💎 Создать задание за TON
          </button>
        ) : (
          <CreateTaskForm onClose={() => setShowCreate(false)} />
        )}

        {!tasks?.length ? (
          <div className="flex flex-col items-center py-16" style={{ color: 'rgba(26,22,42,0.4)' }}>
            <span className="text-5xl mb-4">📋</span>
            <p>Заданий пока нет</p>
          </div>
        ) : (
          tasks.map((task: any) => (
            <div key={task.id} onClick={() => setSelectedTaskId(task.id)}
              className="rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
              style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
              <div className="px-4 py-3" style={{ background: DARK }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ background: task.status === 'ACTIVE' ? '#fe7b11' : 'rgba(255,255,255,0.12)' }}>
                    {task.status === 'ACTIVE' ? '● Активное' : '✓ Завершено'}
                  </span>
                  <span className="text-xs text-white/50">
                    {task._count?.entries || 0} участников
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="font-bold mb-1" style={{ color: DARK }}>{task.title}</p>
                <p className="text-sm" style={{ color: 'rgba(26,22,42,0.5)' }}>
                  📢 @{task.channelUsername}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#0098EA' }}>
                  💎 {task.budget} TON бюджет
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
