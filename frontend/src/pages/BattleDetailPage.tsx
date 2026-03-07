import { useRef, useState } from 'react'
import { useBattle, useEnterBattle } from '../hooks/useBattles'
import { useUser } from '../hooks/useUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Star, Users, Camera, LogOut, Clock, Share2, ExternalLink, Trophy } from 'lucide-react'
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
      WebApp.showAlert('Ты вышел из батла. Взнос BS⭐ возвращён.')
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
      const result = await enterBattle.mutateAsync({ battleId, photo: selectedFile, username: user?.username || user?.firstName || 'участник' })
      setPreview(null)
      setSelectedFile(null)
      const achievements = (result as any)?.achievements
      if (achievements?.length > 0) {
        const msg = achievements.map((a: any) => `🏆 ${a.label} +${a.bonus} бонусных голоса`).join('\n')
        WebApp.showAlert(`Ты в батле!\n\n${msg}`)
      } else {
        WebApp.showAlert('Ты в батле! Голосование началось.')
      }
    } catch (err: any) {
      const errData = err.response?.data
      if (errData?.error === 'NOT_SUBSCRIBED') {
        WebApp.showAlert(`Сначала подпишись на @${errData.channel} — это условие участия в этом батле.`)
      } else {
        WebApp.showAlert(errData?.error || 'Ошибка')
      }
    }
  }

  const handleShare = (entryId: number) => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'fotobatle_bot'
    const link = `https://t.me/${botUsername}/PhotoBatle?startapp=e${entryId}`
    const text = `Оцени моё фото в ФотоБатл! 📸🔥`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
    WebApp.openTelegramLink(shareUrl)
  }

  const entries = battle.entries || []

  const prizeConfig: any[] = (battle as any).prizeConfig || []
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

  const prizeLabel = (p: any) => {
    if (battle.prizeType === 'POOL_PERCENT') return `${p.percent}% пула`
    if (battle.prizeType === 'FIXED') return `${p.amount} BS⭐`
    return p.description || 'Подарок'
  }

  return (
    <div className="flex flex-col pb-24" style={{ background: '#fcfeff', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-5" style={{ background: DARK }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={18} color="white" />
          </button>
          <h1 className="text-white flex-1"
            style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.5rem', lineHeight: 1.1 }}>
            {battle.title}
          </h1>
        </div>
        {battle.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)', paddingLeft: '0.25rem' }}>
            {battle.description}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-2 px-4 pt-4 mb-3">
        <div className="flex-1 rounded-2xl p-3 text-center"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <p className="font-bold text-base" style={{ color: '#fe7b11' }}>{battle.prizePool}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(26,22,42,0.45)' }}>Пул BS⭐</p>
        </div>
        <div className="flex-1 rounded-2xl p-3 text-center"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <p className="font-bold text-base" style={{ color: DARK }}>{battle._count?.entries || 0}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(26,22,42,0.45)' }}>Участников</p>
        </div>
        <div className="flex-1 rounded-2xl p-3 text-center"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <p className="font-bold text-base" style={{ color: DARK }}>{battle.entryFee > 0 ? `${battle.entryFee} BS⭐` : 'Бесплатно'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(26,22,42,0.45)' }}>Взнос</p>
        </div>
      </div>

      {/* Prizes block */}
      {prizeConfig.length > 0 && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden"
          style={{ background: DARK, border: '1px solid rgba(254,123,17,0.2)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Trophy size={15} color="#fe7b11" />
            <span className="text-sm font-semibold text-white">Призовые места</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(254,123,17,0.2)', color: '#fe7b11' }}>
              {prizeConfig.length} {prizeConfig.length === 1 ? 'место' : prizeConfig.length < 5 ? 'места' : 'мест'}
            </span>
          </div>
          <div className="px-4 py-2">
            {prizeConfig.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: i < prizeConfig.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{medals[i] || `#${i + 1}`}</span>
                  <span className="text-sm text-white/70">{i + 1} место</span>
                </div>
                <span className="text-sm font-bold" style={{ color: i === 0 ? '#fe7b11' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.6)' }}>
                  {prizeLabel(p)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                {myEntry.score} BS⭐ · {myEntry.rank ? `#${myEntry.rank}` : 'без ранга'}
              </p>
            </div>
            {battle.status === 'UPCOMING' && (
              <button
                onClick={() => WebApp.showConfirm(
                  'Выйти из батла? Взнос BS⭐ вернётся только если нет голосов.',
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

      {/* Required channel subscription banner */}
      {canEnter && (battle as any).requiredChannel && (
        <div className="mx-4 mb-3 rounded-2xl p-4"
          style={{ background: 'rgba(0,152,234,0.08)', border: '1px solid rgba(0,152,234,0.3)' }}>
          <p className="font-semibold text-sm mb-1" style={{ color: '#0098EA' }}>
            Обязательная подписка
          </p>
          <p className="text-xs mb-3" style={{ color: 'rgba(26,22,42,0.6)' }}>
            Для участия нужно подписаться на канал{' '}
            <b>@{(battle as any).requiredChannel.channelUsername}</b>{' '}
            ({(battle as any).requiredChannel.subscribedCount}/{(battle as any).requiredChannel.targetSubscribers} подписчиков)
          </p>
          <button
            onClick={() => WebApp.openTelegramLink(`https://t.me/${(battle as any).requiredChannel.channelUsername}`)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#0098EA', border: 'none', cursor: 'pointer', color: 'white' }}
          >
            <ExternalLink size={15} />
            Открыть канал и подписаться
          </button>
        </div>
      )}

      {/* Enter battle */}
      {canEnter && (
        <div className="mx-4 mb-4 rounded-2xl p-4"
          style={{ background: CARD, border: '1px solid rgba(26,22,42,0.08)' }}>
          <h2 className="font-semibold mb-3" style={{ color: DARK }}>Участвовать в батле</h2>

          {!hasBalance && (
            <p className="text-red-500 text-sm mb-3">
              Недостаточно Батл Старс. Нужно {battle.entryFee} BS⭐, у тебя {user?.balance || 0}.
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
                  {enterBattle.isPending ? 'Загрузка...' : `Участвовать (${battle.entryFee} BS⭐)`}
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

      {/* Participants grid */}
      {entries.length > 0 && (
        <div className="px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'rgba(26,22,42,0.45)' }}>
            Участники · {entries.length}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {entries.map((entry, i) => (
              <div key={entry.id} className="relative rounded-2xl overflow-hidden"
                style={{ aspectRatio: '3/4' }}>
                <img src={mediaUrl(entry.photoUrl)} alt="" className="w-full h-full object-cover"
                  style={{ objectPosition: '50% 15%' }} />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8) 100%)' }} />
                {i < 3 && (
                  <span className="absolute top-2 left-2 text-lg">
                    {['🥇', '🥈', '🥉'][i]}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-semibold truncate">{entry.user?.firstName}</p>
                  <p className="text-xs font-bold" style={{ color: '#fe7b11' }}>{entry.score} BS⭐</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
