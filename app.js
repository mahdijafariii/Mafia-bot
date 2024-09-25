const dotenv = require('dotenv')
const env = dotenv.config().parsed
const {Telegraf, Markup} = require('telegraf')
const {message} = require('telegraf/filters')
const { v4: uuidv4 } = require('uuid');
const knex = require('./config/db')
const redis = require('redis')
const actions = require('./actions/action')
const client = redis.createClient();
client.connect();

const bot = new Telegraf(env.BOT_TOKEN)
bot.start(async (ctx) => {
    const invited_code = ctx.payload
    if (invited_code){
        const invited_room = await knex('room_member').insert({
            member_id : ctx.chat.id,
            room_id : invited_code,
            name : ctx.chat.first_name
        })
        ctx.reply('به اتاق بازی اضافه شدی، منتظر بمون تا مدیر اتاق بازی را شروع کنه🔃\n وقتی بازی شروع بشه بهت خبر میدم 💓 ')
    }
    else {
        ctx.reply(`به ربات بازی مافیا خوش آمدید 🌿`,
            Markup.inlineKeyboard(
                [Markup.button.callback('ساخت اتاق', "create_room"),
                        Markup.button.callback('پروفایل من',"profile")]
            ))
        const user = await knex("users").where({user_name : ctx.chat.id}).first()
        if(!user){
            await knex('users').insert({
                user_name : ctx.chat.id
            })
        }
    }
})
bot.launch()

bot.on(`text`, async (ctx) => {
    const userId = ctx.chat.id
    const message = ctx.message.text
    const action = await client.get(`user:${userId}:owner_room`)
    if (action) {
        if (action == "member_count") {
            const updateRoom = await knex("rooms").update(
                {member_count: parseInt(message)}).where({owner_room: userId}).orderBy('id', 'DESC').limit(1);
            ctx.reply(`ظرفیت بازیکنان اتاق شما ${message} میباشد . \n حالا تعداد مافیا هارا وارد کن :`)
            await client.setEx(`user:${userId}:owner_room`, 90, 'mafia_count');

        }
        if (action == "mafia_count") {
            const updateRoom = await knex("rooms").update(
                {mafia_count: parseInt(message)}).where({owner_room: userId}).orderBy('id', 'DESC').limit(1);
            const room = await knex("rooms").where({owner_room: userId}).orderBy('id', 'DESC').first();
            ctx.reply(`لینک دعوت اتاق شما 👇🏻`)
            ctx.reply(`https://t.me/mafia_supergame_bot?start=${room.room_code}`)
            await client.del(`user:${userId}:owner_room`);
        }

    }

    const editAction = await client.get(`user:${userId}:user_name`);
    if (editAction == "edit_info") {
        await knex("users").update(
            { nick_name: message }
        ).where({ user_name: userId }).limit(1);

        ctx.reply(`نام مورد نظر شما با موفقیت تغییر یافت ✅`);
        await actions.start_bot(ctx,knex)
        await client.del(`user:${userId}:user_name`);

    }

})

bot.action('edit_info',async (ctx)=>{
    await actions.edit_info(ctx,client)
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
bot.action('previous',async (ctx) =>{
    await actions.previous(ctx,knex)
})

bot.action('profile',async (ctx) =>{
    const user = await knex("users").where({user_name : ctx.chat.id}).first()
    ctx.editMessageText('اطلاعات شما به شرح زیر است : \n' +
        `نام کاربری : ${ctx.chat.first_name} 
        نام مستعار در بازی :${user.nick_name} `,
        Markup.inlineKeyboard(
            [Markup.button.callback('تغییر نام کاربری', "edit_info"),
                Markup.button.callback('بازگشت ',"previous")]
        ))
})



// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))