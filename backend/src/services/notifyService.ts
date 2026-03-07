const BOT_TOKEN = process.env.BOT_TOKEN || ''
const MINI_APP_URL = process.env.MINI_APP_URL || ''

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
