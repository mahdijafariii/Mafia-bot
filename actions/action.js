const {Markup} = require("telegraf");
const knex = require("../config/db");
const edit_info = async (ctx,client)=>{
    const userId = ctx.chat.id
    await client.setEx(`user:${userId}:user_name`, 90, 'edit_info')
    ctx.editMessageText("نام مورد نظر خود را وارد کنید 🍂")
}

const start_bot = async (ctx,knex)=>{
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

const previous = async (ctx,knex) =>{
    ctx.editMessageText(`به ربات بازی مافیا خوش آمدید 🌿`,
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



module.exports = {edit_info , start_bot, previous}