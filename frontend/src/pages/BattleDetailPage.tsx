import { useRef, useState } from 'react'
import { useBattle, useEnterBattle } from '../hooks/useBattles'
import { useUser } from '../hooks/useUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Star, Users, Camera, LogOut, Clock } from 'lucide-react'
import WebApp from '@twa-dev/sdk'
import api from '../api/client'

interface Props {
  battleId: number
  onBack: () => void
}

export default function BattleDetailPage({ battleId, onBack }: Props) {
  const { data: battle } = useBattle(battleId)
  const { data: user } = useUser()
  const enterBattle = useEnterBattle()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const leaveBattle = useMutation({
    mutationFn: () => api.delete(`/battles/${battleId}/entry`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      WebApp.showAlert('Ты вышел из батла. Взнос возвращён.')
    },
    onError: (err: any) => WebApp.showAlert(err.response?.data?.error || 'Ошибка')
  })

  if (!battle) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const myEntry = battle.entries?.find(e => e.userId === user?.id)
  const canEnter = !myEntry && battle.status === 'ACTIVE'
  const hasBalance = (user?.balance || 0) >= battle.entryFee

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleSubmit = async () => {
    if (!selectedFile) return
    try {
      await enterBattle.mutateAsync({ battleId, photo: selectedFile })
      setPreview(null)
      setSelectedFile(null)
      WebApp.showAlert('Ты в батле! Голосование началось.')
    } catch (err: any) {
      WebApp.showAlert(err.response?.data?.error || 'Ошибка')
    }
  }

  const top3 = battle.entries?.slice(0, 3) || []

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 truncate">{battle.title}</h1>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4 mb-4">
        <div className="flex-1 rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Star size={16} className="text-yellow-400" fill="currentColor" />
          <div>
            <p className="text-yellow-400 font-bold text-sm">{battle.prizePool}</p>
            <p className="text-white/40 text-xs">Призовой пул</p>
          </div>
        </div>
        <div className="flex-1 rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Users size={16} className="text-pink-400" />
          <div>
            <p className="text-pink-400 font-bold text-sm">{battle._count?.entries || 0}</p>
            <p className="text-white/40 text-xs">Участников</p>
          </div>
        </div>
        <div className="flex-1 rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Star size={16} className="text-white/40" />
          <div>
            <p className="text-white font-bold text-sm">{battle.entryFee}</p>
            <p className="text-white/40 text-xs">Взнос</p>
          </div>
        </div>
      </div>

      {/* My entry */}
      {myEntry && (
        <div className="mx-4 mb-4 rounded-2xl p-3"
          style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              <img src={myEntry.photoUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-pink-400 font-semibold text-sm">Ты участвуешь!</p>
              <p className="text-white/60 text-xs">{myEntry.score} очков · {myEntry.rank ? `#${myEntry.rank}` : 'без ранга'}</p>
            </div>
            {battle.status === 'ACTIVE' && (
              <button
                onClick={() => WebApp.showConfirm(
                  'Выйти из батла? Взнос вернётся только если на твоё фото ещё нет голосов.',
                  (ok) => { if (ok) leaveBattle.mutate() }
                )}
                disabled={leaveBattle.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer' }}
              >
                <LogOut size={13} />
                Выйти
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upcoming message */}
      {battle.status === 'UPCOMING' && (
        <div className="mx-4 mb-4 rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Clock size={20} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">Батл ещё не начался</p>
            <p className="text-white/50 text-xs">
              Старт: {new Date(battle.startsAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      {/* Enter battle */}
      {canEnter && (
        <div className="mx-4 mb-4 rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-white font-semibold mb-3">Участвовать в батле</h2>

          {!hasBalance && (
            <p className="text-red-400 text-sm mb-3">
              Недостаточно монет. Нужно {battle.entryFee}, у тебя {user?.balance || 0}.
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileChange}
            className="hidden"
          />

          {preview ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                <img src={preview} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPreview(null); setSelectedFile(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60"
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer' }}
                >
                  Сменить фото
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={enterBattle.isPending || !hasBalance}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', cursor: 'pointer' }}
                >
                  {enterBattle.isPending ? 'Загрузка...' : `Участвовать (${battle.entryFee} монет)`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!hasBalance}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', cursor: hasBalance ? 'pointer' : 'not-allowed' }}
              >
                <Camera size={18} />
                Загрузить фото
              </button>
            </div>
          )}
        </div>
      )}

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="px-4">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Лидеры</h2>
          <div className="flex flex-col gap-2">
            {top3.map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{entry.user?.firstName}</p>
                </div>
                <span className="text-pink-400 font-bold text-sm">{entry.score} очков</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
