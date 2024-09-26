const dotenv = require('dotenv')
const env = dotenv.config().parsed
const {Telegraf, Markup} = require('telegraf')
const {message} = require('telegraf/filters')
const { v4: uuidv4 } = require('uuid');
const knex = require('./config/db')
const redis = require('redis')
const actions = require('./actions/action')
const controller = require('./controller')
const client = redis.createClient();
client.connect();

const bot = new Telegraf(env.BOT_TOKEN)
bot.start(async (ctx) => {
    const invited_code = ctx.payload
    if (invited_code){
        const room = await knex("rooms").where({room_code : invited_code , status : "pending"}).first();
        const roomMemberCount = await knex('room_member').where({room_code : room.room_code})
        if (room){
            if (roomMemberCount.length < room.member_count){
                const inviteBefore =  await knex('room_member').where({
                    member_id : ctx.chat.id,
                    room_code : invited_code,
                    member_number : (roomMemberCount.length + 1)
                }).first();
                if(!inviteBefore){
                    const invited_user = await knex('room_member').insert({
                        member_id : ctx.chat.id,
                        room_code : invited_code,
                        name : ctx.chat.first_name
                    })
                    ctx.reply('به اتاق بازی اضافه شدی، منتظر بمون تا مدیر اتاق بازی را شروع کنه🔃\n وقتی بازی شروع بشه بهت خبر میدم 💓 ')

                    if ((roomMemberCount.length+1) === room.member_count){
                        ctx.reply(`همه پلیر ها اومدن ⭐`,{
                                chat_id : room.owner_room,
                                reply_markup : {
                                    inline_keyboard : [
                                        [
                                                    Markup.button.callback('شروع بازی ⭐', 'start_game'),
                                                    Markup.button.callback('لغو بازی‼️', 'cancel_game')
                                                ]
                                    ]
                                }
                            }
                        )
                    }
                    else{
                        ctx.reply(`کاربر جدیدی به اتاق بازی اضافه شد ، ظرفیت باقی مانده ${room.member_count - (roomMemberCount.length + 1)} / ${room.member_count}`, { chat_id : room.owner_room})
                    }
                }
                else {
                    ctx.reply("شما قبلا به این اتاق اضافه شده اید ، لطفا تا شروع بازی منتظر بمانید⌛")
                }
            }
            else {
                ctx.reply('ظرفیت اتاق تکمیل است ! 😭')

            }

        }
        else{
            ctx.reply('اتاق نامعتبر است 😭')
        }

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
    const playerRoom = await client.get(`players:${userId}`)

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

    if(playerRoom){
        const speekTime    =  await  client.get(`room:${playerRoom}:speek`)
        const totalPLayers =  await  client.get(`room:${playerRoom}:total`)
        const room         =  await  knex('rooms').where('id', playerRoom).first()

        // get players
        const player  = await knex('room_member').where({ 'room_id': playerRoom, 'member_id': chatId }).first()
        const players = await knex('room_member').whereRaw(`room_id = ${playerRoom} && member_id != ${chatId}`)

        // talking mafia players in night
        if(speekTime > totalPLayers){
            if(player.role == "shahr")
                ctx.reply("شما شهروند هستید و شهروندان توی شب اجازه صحبت ندارند 🌒")
            else if(player.role == "mafia"){
                for(const mafiaPlayer of players){
                    if(mafiaPlayer.role == "mafia"){
                        ctx.reply(`(${player.member_number}) ${player.member_name}: \n${message}`, { chat_id: mafiaPlayer.member_id })
                    }
                }
                ctx.reply(`(${player.member_number}) ${player.member_name}: \n${message}`, { chat_id: room.owner_room })
            }
        }
        else {
            if(speekTime == player.member_number){
                // send for god
                ctx.reply(`(${player.member_number}) ${player.member_name}: \n${message}`, { chat_id: room.owner_room })

                // send for players
                for(const otherPlayer of players){
                    ctx.reply(`(${player.member_number}) ${player.member_name}: \n${message}`, { chat_id: otherPlayer.member_id })
                }
            }else ctx.reply("نوبت صحبت شما نیست ❌")
        }
    }


})

bot.action('edit_info',async (ctx)=>{
    await actions.edit_info(ctx,client)
})
bot.action(`create_room`, async (ctx) => {
    await actions.create_room(ctx,client,knex)
})
bot.action('previous',async (ctx) =>{
    await actions.previous(ctx,knex)
})

bot.action('profile',async (ctx) =>{
    await actions.profile(ctx)
})

bot.action('start_game' , async (ctx)=>{
    const userId = ctx.chat.id
    const room = await knex("rooms").where({owner_room: userId}).orderBy('id', 'DESC').first();
    const updateRoom = await knex("rooms").where({owner_room: userId}).orderBy('id', 'DESC').limit(1).update({status : 'started'});
    const players = await knex('room_member').where({room_code : room.room_code}).select("member_id","name")

    const totalPlayers = room.member_count
    const mafiaCount = room.mafia_count

    let roles = []

    for (i = 0 ; i < mafiaCount ; i++) roles.push('mafia')
    for (i = 0 ; i < (totalPlayers - mafiaCount) ; i++) roles.push('shahr')


    for(const player of players){
        const role = controller.randomRole(roles)
        if (role === "shahr"){
            ctx.reply('بازی شروع شد 🔍', {chat_id : player.member_id})
            ctx.reply('نقشت در بازی شهرورنده 🥰', {chat_id : player.member_id})
        }
        else {
            ctx.reply('بازی شروع شد 🔍', {chat_id : player.member_id})
            ctx.reply('نقشت در بازی مافیاست 🫣', {chat_id : player.member_id})
        }
        const updateRole = await knex('room_member').where({room_code : room.room_code ,member_id : player.member_id}).update({role : role})
    }
    await client.set(`room:${room.id}:speek`, "1")
    await client.set(`room:${room.id}:total`, room.member_count)

    // controller God
    ctx.reply("بازی شروع شد✅", {
        reply_markup: {
            keyboard: [
                [
                    { text: "نفر بعد ⏭️" }
                ],
                [
                    { text: "شب شدن  🌒" },
                    { text: "روز شدن ☀️" }
                ]
            ]
        }
    })

})

bot.hears("نفر بعد ⏭️", async (ctx) => {
    const chatId  = ctx.chat.id

    const room = await knex('rooms').where({ 'owner_room': chatId, 'status': 'started' }).first()

    if(room){
        const players = await knex('room_member').whereRaw(`room_id = ${room.id}`)

        // player 1 open
        const getSpeekTime = parseInt(await client.get(`room:${room.id}:speek`))
        const totalCount   = parseInt(await client.get(`room:${room.id}:total`))

        await client.set(`room:${room.id}:speek`, (getSpeekTime+1))

        if(!((getSpeekTime+1) > totalCount)){
            for(const player of players){
                ctx.reply(`نوبت صحبت پلیر شماره ${(getSpeekTime+1)}`, { chat_id: player.member_id })
            }
            ctx.reply(`نوبت صحبت پلیر شماره ${(getSpeekTime+1)}`, { chat_id: room.owner_room })
        }else ctx.reply(`همه بازیکن ها صحبت کردن. الان باید شب بشه!`, { chat_id: room.owner_room })
    }
})
bot.hears("شب شدن  🌒", async (ctx) => {
    const chatId  = ctx.chat.id

    const room = await knex('rooms').where({ 'owner_room': chatId, 'status': 'started' }).first()

    if(room){
        const players = await knex('room_member').whereRaw(`room_id = ${room.id}`)

        // player 1 open
        for(const player of players){
            ctx.reply(`شب شد 🌒`, { chat_id: player.member_id })
        }
    }
})

bot.hears("روز شدن ☀️", async (ctx) => {
    const chatId  = ctx.chat.id

    const room = await knex('rooms').where({ 'owner_room': chatId, 'status': 'started' }).first()

    if(room){
        const players = await knex('room_member').whereRaw(`room_id = ${room.id}`)

        await client.set(`room:${room.id}:speek`, 1)

        // player 1 open
        for(const player of players){
            ctx.reply(`روز شد ☀️ \n بازیکن شماره یک میتونه صحبت کنه`, { chat_id: player.member_id })
        }
    }
})


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))