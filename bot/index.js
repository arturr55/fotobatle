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

bot.launch()

console.log('Bot started!')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
