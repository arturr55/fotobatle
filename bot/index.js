require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://yourdomain.com'

bot.command('start', (ctx) => {
  const firstName = ctx.from.first_name

  ctx.replyWithPhoto(
    { url: 'https://i.imgur.com/placeholder.jpg' },
    {
      caption: `🔥 *ФотоБатл* — соревнуйся и выигрывай!\n\nПривет, ${firstName}!\n\n📸 Загружай фото\n❤️ Голосуй за других\n⭐ Выигрывай монеты\n\nСтарт — внутри!`,
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Открыть ФотоБатл', MINI_APP_URL)],
        [Markup.button.callback('❓ Как это работает?', 'how_it_works')]
      ])
    }
  ).catch(() => {
    ctx.reply(
      `🔥 *ФотоБатл* — соревнуйся и выигрывай!\n\nПривет, ${firstName}!\n\n📸 Загружай фото\n❤️ Голосуй за других\n⭐ Выигрывай монеты`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🚀 Открыть ФотоБатл', MINI_APP_URL)],
          [Markup.button.callback('❓ Как это работает?', 'how_it_works')]
        ])
      }
    )
  })
})

bot.action('how_it_works', (ctx) => {
  ctx.answerCbQuery()
  ctx.reply(
    `*Как работает ФотоБатл?*\n\n` +
    `1️⃣ Открой батл и загрузи своё фото\n` +
    `2️⃣ Заплати взнос монетами (10 Stars = 10 монет)\n` +
    `3️⃣ Другие участники голосуют за фото реакциями\n` +
    `4️⃣ В конце батла топ-3 получают призы из общего пула\n\n` +
    `💰 *Призы:*\n🥇 1-е место — 50% пула\n🥈 2-е место — 25% пула\n🥉 3-е место — 15% пула\n\n` +
    `*Вывод монет* — минимум 100, срок 24-48 часов.`,
    { parse_mode: 'Markdown' }
  )
})

bot.command('help', (ctx) => {
  ctx.reply(
    `*Команды ФотоБатл:*\n\n/start — главное меню\n/help — помощь`,
    { parse_mode: 'Markdown' }
  )
})

// Must answer pre_checkout_query within 10 seconds
bot.on('pre_checkout_query', (ctx) => {
  ctx.answerPreCheckoutQuery(true)
})

bot.on('message', async (ctx) => {
  if (!ctx.message.successful_payment) return

  const payment = ctx.message.successful_payment
  const parts = payment.invoice_payload.split(':')
  const userId = parseInt(parts[0])
  const coins = parseInt(parts[1])

  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'
  const BOT_SECRET = process.env.BOT_SECRET || ''

  try {
    const resp = await fetch(`${BACKEND_URL}/api/balance/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': BOT_SECRET,
      },
      body: JSON.stringify({
        userId,
        coins,
        telegramChargeId: payment.telegram_payment_charge_id,
      }),
    })
    if (resp.ok) {
      ctx.reply(`Баланс пополнен на ${coins} монет! Удачи в батлах!`)
    } else {
      ctx.reply('Оплата получена, но произошла ошибка зачисления. Напишите в поддержку.')
    }
  } catch (err) {
    console.error('Deposit error:', err)
    ctx.reply('Оплата получена, но произошла ошибка зачисления. Напишите в поддержку.')
  }
})

const WEBHOOK_URL = process.env.WEBHOOK_URL
const PORT = parseInt(process.env.PORT || '3000')

if (WEBHOOK_URL) {
  bot.launch({
    webhook: {
      domain: WEBHOOK_URL,
      port: PORT,
    },
  })
  console.log(`Bot started (webhook: ${WEBHOOK_URL})`)
} else {
  bot.launch({ dropPendingUpdates: true })
  console.log('Bot started (polling)')
}

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
