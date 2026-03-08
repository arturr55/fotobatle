require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')
const http = require('http')

const bot = new Telegraf(process.env.BOT_TOKEN)
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://yourdomain.com'

bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name

  await ctx.reply(
    `🔥 *Фото Баттл* — соревнуйся и выигрывай!\n\nПривет, ${firstName}! 👋\n\n📸 Загружай фото в баттл\n❤️ Голосуй за других\n⭐ Выигрывай монеты и призы`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Открыть Фото Баттл', MINI_APP_URL)],
        [Markup.button.url('🔗 Открыть Фото Баттл', 'https://t.me/photobattletgbot/PhotoBattle')],
        [Markup.button.callback('❓ Как это работает?', 'how_it_works')]
      ])
    }
  )

  await ctx.replyWithInvoice({
    title: 'Стартовый пакет',
    description: '5 Батл Старс — хватит на первый батл!',
    payload: `${ctx.from.id}:5`,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: '5 Батл Старс', amount: 5 }],
  }).catch((err) => console.error('Invoice error:', err))
})

bot.action('how_it_works', (ctx) => {
  ctx.answerCbQuery()
  ctx.reply(
    `*Как работает Фото Баттл?*\n\n` +
    `1️⃣ Открой баттл и загрузи своё фото\n` +
    `2️⃣ Заплати взнос монетами\n` +
    `3️⃣ Другие участники голосуют за фото реакциями\n` +
    `4️⃣ В конце баттла топ-3 получают призы из общего пула\n\n` +
    `💰 *Призы:*\n🥇 1-е место — 50% пула\n🥈 2-е место — 25% пула\n🥉 3-е место — 15% пула\n\n` +
    `*Вывод монет* — минимум 10, срок 24-48 часов.`,
    { parse_mode: 'Markdown' }
  )
})

bot.command('help', (ctx) => {
  ctx.reply(
    `*Команды Фото Баттл:*\n\n/start — главное меню\n/help — помощь`,
    { parse_mode: 'Markdown' }
  )
})

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
      ctx.reply(`Баланс пополнен на ${coins} Батл Старс! Удачи в баттлах! ⭐`)
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
const WEBHOOK_PATH = `/webhook/${bot.secretPathComponent()}`

console.log(`Starting bot... PORT=${PORT}, WEBHOOK=${WEBHOOK_URL}, TOKEN=${!!process.env.BOT_TOKEN}`)

if (WEBHOOK_URL) {
  const webhookUrl = `${WEBHOOK_URL.replace(/\/$/, '')}${WEBHOOK_PATH}`

  bot.telegram.setWebhook(webhookUrl).then(() => {
    console.log(`Webhook set to: ${webhookUrl}`)

    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }

      if (req.method === 'POST' && req.url === WEBHOOK_PATH) {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const update = JSON.parse(body)
            bot.handleUpdate(update).then(() => {
              res.writeHead(200)
              res.end('ok')
            }).catch(err => {
              console.error('handleUpdate error:', err)
              res.writeHead(500)
              res.end('error')
            })
          } catch (err) {
            console.error('JSON parse error:', err)
            res.writeHead(400)
            res.end('bad request')
          }
        })
        return
      }

      res.writeHead(404)
      res.end('not found')
    })

    server.listen(PORT, () => {
      console.log(`Bot server listening on port ${PORT}`)
    })
  }).catch(err => {
    console.error('Failed to set webhook:', err)
    process.exit(1)
  })
} else {
  bot.launch({ dropPendingUpdates: true }).then(() => {
    console.log('Bot started (polling)')
  }).catch(err => {
    console.error('Failed to start bot:', err)
    process.exit(1)
  })
}

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
