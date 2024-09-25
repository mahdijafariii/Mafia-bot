const {Markup} = require("telegraf");
const knex = require("../config/db");
const edit_info = async (ctx, client) => {
    const userId = ctx.chat.id
    await client.setEx(`user:${userId}:user_name`, 90, 'edit_info')
    ctx.editMessageText("نام مورد نظر خود را وارد کنید 🍂")
}

const start_bot = async (ctx, knex) => {
    ctx.reply(`به ربات بازی مافیا خوش آمدید 🌿`,
        Markup.inlineKeyboard(
            [Markup.button.callback('ساخت اتاق', "create_room"),
                Markup.button.callback('پروفایل من', "profile")]
        ))
    const user = await knex("users").where({user_name: ctx.chat.id}).first()
    if (!user) {
        await knex('users').insert({
            user_name: ctx.chat.id
        })
    }
}

const previous = async (ctx, knex) => {
    ctx.editMessageText(`به ربات بازی مافیا خوش آمدید 🌿`,
        Markup.inlineKeyboard(
            [Markup.button.callback('ساخت اتاق', "create_room"),
                Markup.button.callback('پروفایل من', "profile")]
        ))
    const user = await knex("users").where({user_name: ctx.chat.id}).first()
    if (!user) {
        await knex('users').insert({
            user_name: ctx.chat.id
        })
    }
}
const profile = async (ctx) => {
    const user = await knex("users").where({user_name: ctx.chat.id}).first()
    ctx.editMessageText('اطلاعات شما به شرح زیر است : \n' +
        `نام کاربری : ${ctx.chat.first_name} 
        نام مستعار در بازی :${user.nick_name} `,
        Markup.inlineKeyboard(
            [Markup.button.callback('تغییر نام کاربری', "edit_info"),
                Markup.button.callback('بازگشت ', "previous")]
        ))
}


module.exports = {edit_info, start_bot, previous,profile}