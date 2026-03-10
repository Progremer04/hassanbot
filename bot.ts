import { Telegraf, Context } from "telegraf";
import { storage } from "./storage";

let bot: Telegraf<Context> | null = null;
let isRunning = false;

// --- Config ---
const CHANNEL_1 = "@animatrix2026";
const CHANNEL_2_LINK = "https://t.me/+esAvaRd-9npjYzFk";
const OWNER_ID = "7606499525";
const TELEGRAM_BOT_TOKEN = "8794001090:AAF-Y7ZWPkjQael4nWh1Q2X1tQ17zK4L6Lg";

// --- Telegram custom emojis ---
const em = (id: string, fb: string) => `<tg-emoji emoji-id="${id}">${fb}</tg-emoji>`;
const E = {
  welcome: em("5352140790705143180", "🚀"),
  crown: em("5361543624510602409", "👑"),
  star: em("5374002218607565948", "⭐"),
  fire: em("5352140790705143180", "🔥"),
  diamond: em("5471931592411741163", "💎"),
  check: em("5373117987558518900", "✅"),
  cross: em("5465665476971471118", "❌"),
  ban: em("5463372088888892171", "🚫"),
  bell: em("5376441753817684258", "🔔"),
  lock: em("5379748062124056162", "🔐"),
  mail: em("5379748062124056162", "📧"),
  tag: em("5374027593896124404", "🎁"),
  chart: em("5373117987558518900", "📊"),
  folder: em("5374027593896124404", "🗂"),
  broadcast: em("5376441753817684258", "📡"),
  user: em("5352060512956846624", "👤"),
  wrench: em("5363307747914146178", "🔧"),
  trash: em("5463372088888892171", "🗑"),
  warning: em("5376441753817684258", "⚠️"),
  plus: em("5373117987558518900", "✨"),
  ticket: em("5374027593896124404", "🎫"),
  pin: em("5374002218607565948", "📌"),
  stop: em("5465665476971471118", "⛔"),
  key: em("5379748062124056162", "🔑"),
  gift: em("5374027593896124404", "🎁"),
  trophy: em("5373117987558518900", "🏆"),
  sparkle: em("5374002218607565948", "✨"),
};

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function isBotRunning() {
  return isRunning;
}

function adminKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "🗂 List Codes" }, { text: "📈 Statistics" }],
        [{ text: "📡 Broadcast" }, { text: "👤 Users" }],
        [{ text: "➕ Add Admin" }, { text: "🗑 Remove Admin" }],
        [{ text: "🚫 Ban User" }, { text: "✅ Unban User" }],
        [{ text: "🔧 Help" }],
      ],
      resize_keyboard: true,
    },
  };
}

async function checkAdmin(ctx: Context): Promise<boolean> {
  const userId = String(ctx.from?.id);
  const isAdm = await storage.isAdmin(userId);
  if (!isAdm) {
    await ctx.reply(`${E.ban} <b>This command is for admins only.</b>`, { parse_mode: "HTML" });
    return false;
  }
  return true;
}

async function checkSubscription(ctx: Context): Promise<boolean> {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_1, ctx.from?.id!);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

export async function startBot() {
  if (isRunning) return;

  if (!TELEGRAM_BOT_TOKEN) {
    console.log("No TELEGRAM_BOT_TOKEN provided");
    return;
  }

  try {
    bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    await storage.addAdmin(OWNER_ID, "owner");

    // ---- /start command ----
    bot.start(async (ctx) => {
      const userId = String(ctx.from?.id);
      await storage.upsertUser(userId, ctx.from?.username, ctx.from?.first_name);

      const isAdm = await storage.isAdmin(userId);
      const text =
        `${E.welcome} Welcome to <b>Animatrix Redeem Platform!</b>\n\n` +
        `${E.pin} <b>How to use:</b>\n` +
        `Send <code>/redeem CODE</code> to get your account credentials\n\n` +
        `${E.bell} <b>Required Channels:</b>\n` +
        `• ${esc(CHANNEL_1)}\n• Animatrix VIP\n\n` +
        `${E.star} Join both channels first, then send your code!`;

      await ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📢 Animatrix", url: "https://t.me/animatrix2026" },
              { text: "💎 Animatrix VIP", url: CHANNEL_2_LINK },
            ],
          ],
        },
      });

      if (isAdm) {
        await ctx.reply(`${E.crown} <b>Welcome back, Admin!</b>`, { parse_mode: "HTML", ...adminKeyboard() });
      }
    });

    // ---- /redeem command ----
    bot.command("redeem", async (ctx) => {
      const userId = String(ctx.from?.id);
      await storage.upsertUser(userId, ctx.from?.username, ctx.from?.first_name);

      if (await storage.isUserBanned(userId)) {
        return ctx.reply(`${E.ban} <b>You have been banned from using this bot.</b>`, { parse_mode: "HTML" });
      }

      const args = ctx.message?.text?.split(/\s+/) || [];
      if (args.length < 2) return ctx.reply(`${E.warning} Usage: <code>/redeem CODE</code>`, { parse_mode: "HTML" });

      if (!(await checkSubscription(ctx))) {
        return ctx.reply(`${E.ban} <b>You must join our channels first!</b>`, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📢 Animatrix", url: "https://t.me/animatrix2026" },
                { text: "💎 Animatrix VIP", url: CHANNEL_2_LINK },
              ],
            ],
          },
        });
      }

      const codeValue = args[1].toUpperCase();
      const codeRecord = await storage.getCodeByValue(codeValue);
      if (!codeRecord) return ctx.reply(`${E.cross} <b>Invalid or incorrect code.</b>`, { parse_mode: "HTML" });
      if (codeRecord.isUsed) return ctx.reply(`${E.stop} <b>This code has already been used.</b>`, { parse_mode: "HTML" });

      await storage.markCodeUsed(codeValue, userId, ctx.from?.username || "Unknown");
      await storage.createRedemption({
        code: codeValue,
        userId,
        username: ctx.from?.username || "Unknown",
        firstName: ctx.from?.first_name || "",
        email: codeRecord.email,
        password: codeRecord.password,
        label: codeRecord.label || "",
      });

      await ctx.reply(`${E.check} <b>Redeemed Successfully!</b>\nEmail: <code>${esc(codeRecord.email)}</code>\nPassword: <code>${esc(codeRecord.password)}</code>`, { parse_mode: "HTML" });
    });

    bot.launch({ dropPendingUpdates: true });
    isRunning = true;
    console.log("✅ Telegram bot started successfully");
  } catch (err) {
    console.error("Failed to start bot:", err);
    isRunning = false;
  }
}

export async function stopBot() {
  if (!isRunning || !bot) return;
  bot.stop("Manual stop");
  bot = null;
  isRunning = false;
  console.log("🛑 Telegram bot stopped");
}
