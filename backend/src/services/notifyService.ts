const BOT_TOKEN = process.env.BOT_TOKEN || ''
const MINI_APP_URL = process.env.MINI_APP_URL || ''
const ANNOUNCEMENT_CHANNEL = process.env.ANNOUNCEMENT_CHANNEL || '@photobattletg'

export async function announceWinners(battleTitle: string, winners: Array<{
  rank: number
  prize: number
  score: number
  photoUrl: string | null
  firstName: string
  username: string | null
}>) {
  if (!BOT_TOKEN || winners.length === 0) return
  try {
    const medals = ['🥇', '🥈', '🥉']
    let caption = `🏆 <b>Батл "${battleTitle}" завершён!</b>\n\n`
    for (const w of winners) {
      const medal = medals[w.rank - 1] || `#${w.rank}`
      const name = w.username ? `@${w.username}` : w.firstName
      caption += `${medal} ${name}`
      if (w.prize > 0) caption += ` — <b>+${w.prize} BS⭐</b>`
      caption += ` (${w.score} очков)\n`
    }
    caption += `\n🔥 Участвуй в следующем батле!`

    const replyMarkup = MINI_APP_URL ? JSON.stringify({
      inline_keyboard: [[{ text: '🚀 Участвовать в следующем батле!', web_app: { url: MINI_APP_URL } }]]
    }) : undefined

    const firstPhoto = winners.find(w => w.photoUrl)?.photoUrl
    if (firstPhoto) {
      const base64Data = firstPhoto.replace(/^data:image\/\w+;base64,/, '')
      const photoBuffer = Buffer.from(base64Data, 'base64')
      const formData = new FormData()
      formData.append('chat_id', ANNOUNCEMENT_CHANNEL)
      formData.append('caption', caption)
      formData.append('parse_mode', 'HTML')
      formData.append('photo', new Blob([photoBuffer], { type: 'image/jpeg' }), 'photo.jpg')
      if (replyMarkup) formData.append('reply_markup', replyMarkup)
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      })
    } else {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ANNOUNCEMENT_CHANNEL,
          text: caption,
          parse_mode: 'HTML',
          reply_markup: replyMarkup ? JSON.parse(replyMarkup) : undefined
        })
      })
    }
  } catch (err) {
    console.error('Announce winners error:', err)
  }
}

export async function sendNotification(telegramId: bigint, text: string) {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId.toString(),
        text,
        parse_mode: 'HTML',
        reply_markup: MINI_APP_URL ? {
          inline_keyboard: [[{ text: '🚀 Открыть ФотоБатл', web_app: { url: MINI_APP_URL } }]]
        } : undefined
      })
    })
  } catch (err) {
    console.error('Notify error:', err)
  }
}
