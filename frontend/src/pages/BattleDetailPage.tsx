import { useRef, useState } from 'react'
import { useBattle, useEnterBattle } from '../hooks/useBattles'
import { useUser } from '../hooks/useUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Star, Users, Camera, LogOut, Clock, Share2 } from 'lucide-react'
import WebApp from '@twa-dev/sdk'
import api, { mediaUrl } from '../api/client'

const DARK = '#1a162a'
const CARD = '#dad3cd'

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
      <div className="flex justify-center py-20" style={{ background: '#fcfeff', minHeight: '100vh' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#fe7b11', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const myEntry = battle.entries?.find(e => e.userId === user?.id)
  const canEnter = !myEntry && battle.status === 'UPCOMING'
  const hasBalance = (user?.balance || 0) >= battle.entryFee

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
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

  const handleShare = (entryId: number) => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'fotobatle_bot'
    const link = `https://t.me/${botUsername}/FhotoBatle?startapp=e${entryId}`
    const text = `Оцени моё фото в ФотоБатл! 📸🔥`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
    WebApp.openTelegramLink(shareUrl)
  }

  const top3 = battle.entries?.slice(0, 3) || []

  return (
    <div className="flex flex-col pb-24" style={{ background: '#fcfeff', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-6" style={{ background: DARK }}>
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={18} color="white" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1 truncate"
            style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.4rem' }}>
            {battle.title}
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4 pt-4 mb-4">
        <div className="flex-1 rounded-2xl p-3 flex items-center gap-2"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <Star size={16} fill="#fe7b11" color="#fe7b11" />
          <div>
            <p className="font-bold text-sm" style={{ color: '#fe7b11' }}>{battle.prizePool}</p>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>Призовой пул</p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl p-3 flex items-center gap-2"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <Users size={16} style={{ color: DARK }} />
          <div>
            <p className="font-bold text-sm" style={{ color: DARK }}>{battle._count?.entries || 0}</p>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>Участников</p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl p-3 flex items-center gap-2"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <Star size={16} style={{ color: 'rgba(26,22,42,0.4)' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: DARK }}>{battle.entryFee}</p>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.45)' }}>Взнос</p>
          </div>
        </div>
      </div>

      {/* My entry */}
      {myEntry && (
        <div className="mx-4 mb-4 rounded-2xl p-3"
          style={{ background: CARD, border: '1px solid rgba(254,123,17,0.3)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <img src={mediaUrl(myEntry.photoUrl)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: '#fe7b11' }}>Ты участвуешь!</p>
              <p className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>
                {myEntry.score} очков · {myEntry.rank ? `#${myEntry.rank}` : 'без ранга'}
              </p>
            </div>
            {battle.status === 'UPCOMING' && (
              <button
                onClick={() => WebApp.showConfirm(
                  'Выйти из батла? Взнос вернётся только если нет голосов.',
                  (ok) => { if (ok) leaveBattle.mutate() }
                )}
                disabled={leaveBattle.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40"
                style={{ background: 'rgba(26,22,42,0.08)', border: 'none', cursor: 'pointer', color: 'rgba(26,22,42,0.6)' }}
              >
                <LogOut size={13} />
                Выйти
              </button>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={() => handleShare(myEntry.id)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#fe7b11', border: 'none', cursor: 'pointer', color: 'white', boxShadow: '0 4px 16px rgba(254,123,17,0.35)' }}
          >
            <Share2 size={15} />
            Поделиться ссылкой на фото
          </button>
        </div>
      )}

      {/* Active — no new entries */}
      {battle.status === 'ACTIVE' && !myEntry && (
        <div className="mx-4 mb-4 rounded-2xl p-4 flex items-center gap-3"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <Clock size={20} style={{ color: '#fe7b11', flexShrink: 0 }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: DARK }}>Голосование идёт</p>
            <p className="text-xs" style={{ color: 'rgba(26,22,42,0.5)' }}>Регистрация закрыта — приходи в следующий батл!</p>
          </div>
        </div>
      )}

      {/* Enter battle */}
      {canEnter && (
        <div className="mx-4 mb-4 rounded-2xl p-4"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <h2 className="font-semibold mb-3" style={{ color: DARK }}>Участвовать в батле</h2>

          {!hasBalance && (
            <p className="text-red-500 text-sm mb-3">
              Недостаточно монет. Нужно {battle.entryFee}, у тебя {user?.balance || 0}.
            </p>
          )}

          <input ref={fileRef} type="file" accept="image/*" capture="user"
            onChange={handleFileChange} className="hidden" />

          {preview ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                <img src={preview} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPreview(null); setSelectedFile(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(26,22,42,0.08)', border: 'none', cursor: 'pointer', color: DARK }}
                >
                  Сменить фото
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={enterBattle.isPending || !hasBalance}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: '#fe7b11', border: 'none', cursor: 'pointer' }}
                >
                  {enterBattle.isPending ? 'Загрузка...' : `Участвовать (${battle.entryFee} монет)`}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!hasBalance}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#fe7b11', border: 'none', cursor: hasBalance ? 'pointer' : 'not-allowed' }}
            >
              <Camera size={18} />
              Загрузить фото
            </button>
          )}
        </div>
      )}

      {/* Participants */}
      {top3.length > 0 && (
        <div className="px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'rgba(26,22,42,0.45)' }}>
            Участники
          </h2>
          <div className="flex flex-col gap-2">
            {top3.map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
                <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: DARK }}>{entry.user?.firstName}</p>
                </div>
                <span className="font-bold text-sm" style={{ color: '#fe7b11' }}>{entry.score} очков</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
