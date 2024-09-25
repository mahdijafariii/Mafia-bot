const dotenv = require('dotenv')
const env = dotenv.config().parsed
const {Telegraf, Markup} = require('telegraf')
const {message} = require('telegraf/filters')
const { v4: uuidv4 } = require('uuid');
const knex = require('./config/db')
const redis = require('redis')
const client = redis.createClient();
client.connect();

const bot = new Telegraf(env.BOT_TOKEN)
bot.start((ctx) => {
    const invited_code = ctx.payload
    if (invited_code){


    }
    else {
        ctx.reply(`به ربات بازی مافیا خوش آمدید 🌿`,
            Markup.inlineKeyboard(
                [Markup.button.callback('ساخت اتاق', "create_room")]
            ))
    }
})
bot.launch()

bot.on(`text`, async (ctx) => {
    const userId = ctx.chat.id
    const message = ctx.message.text
    const action = await client.getSet(`user:${userId}:owner_room`, 'mafia_count')
    if (action) {
        if (action == "member_count") {
            const updateRoom = await knex("rooms").update(
                {member_count: parseInt(message)}).where({owner_room: userId}).orderBy('id', 'DESC').limit(1);
            ctx.reply(`ظرفیت بازیکنان اتاق شما ${message} میباشد . \n حالا تعداد مافیا هارا وارد کن :`)

        }
        if (action == "mafia_count") {
            const updateRoom = await knex("rooms").update(
                {mafia_count: parseInt(message)}).where({owner_room: userId}).orderBy('id', 'DESC').limit(1);
            const room = await knex("rooms").where({owner_room: userId}).orderBy('id', 'DESC').first();
            ctx.reply(`لینک دعوت اتاق شما 👇🏻`)
            ctx.reply(`https://t.me/mafia_supergame_bot?start=${room.room_code}`)
        }

    }

})

bot.action(`create_room`, async (ctx) => {
    const userId = ctx.chat.id
    const newRoom = await knex("rooms").insert({
        owner_room: userId,
        create_at: Math.floor(Date.now() / 1000),
        room_code : uuidv4(),
    })

    await client.setEx(`user:${userId}:owner_room`, 90, 'member_count')
    ctx.reply('حالا تعداد بازیکنان را وارد کن :')
})

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))