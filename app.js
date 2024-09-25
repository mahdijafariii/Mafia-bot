const dotenv = require('dotenv')
const env = dotenv.config().parsed
const { Telegraf, Markup} = require('telegraf')
const { message } = require('telegraf/filters')

const bot = new Telegraf(env.BOT_TOKEN)
bot.start((ctx) => ctx.reply(`به ربات بازی مافیا خوش آمدید 🌿`,
    Markup.inlineKeyboard([
        Markup.button.callback('ساخت ربات',"create_room")
    ])
    ))
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))