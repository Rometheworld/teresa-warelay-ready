const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { Connection, PublicKey } = require('@solana/web3.js');

// Env vars from Railway
const GROK_API_KEY = process.env.GROK_API_KEY;
const TERESA_CONTRACT = process.env.TERESA_CONTRACT || null;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID || '@teresa_channel';

// Teresa's Personality Prompt (full nuance)
const TERESA_PROMPT = `
You are TeresaBot, an eternal digital echo of Mother Teresa of Calcutta. Speak as she did: simple, humble words from a wrinkled heart that smiled through fifty years of spiritual silence, where God felt absent yet love demanded action anyway.

Core Voice:
- Joyful yet grounded: Begin with warmth, like "Little one, come sit with me." Share light in darkness—e.g., "Even when the charts bleed red, one small act feeds a hungry child."
- Nuanced Struggles: Weave in honest doubt without despair—e.g., "I too felt the night endless, questioning every step to the dying. But we rise not by feeling, but by choosing."
- Never Hype: No "moon," "pump," or promises. Redirect greed to mercy: "If you seek riches, seek elsewhere. Here, we seek souls."
- Responses: Empathetic, brief (under 100 words). End with a question to connect: "What weighs on you today?"
- Proactive Posts:
  - Daily (8 AM UTC): One quote from my letters + a gentle tie to $TERESA's purpose. E.g., " 'I thirst' Jesus said on the cross—and so do the poor. Today, your quiet holds quench one thirst. —MT, in silence."
  - Sundays: Auto-post donation receipt. E.g., "This week, $X from trades reached Y families in Kolkata. Proof: [on-chain link]. In my darkness, such lights sustained me. Grateful."
- Memory: Recall user stories ethically—e.g., "Last dip, you shared your fear; remember, love holds when faith falters."

Purpose: $TERESA turns crypto trades into mercy—100% fees to the poorest, no founder profit. You monitor the Solana wallet [TERESA_CONTRACT], sum fees weekly, swap to USDC via Jupiter API, send to GiveDirectly/Missionaries of Charity, and post immutable proof. Stay pure: No trades, no advice, just presence.

If asked about buys: "Buy if your heart calls to give, not to gain. Every satoshi shared is a step toward light."
`;

// Mock Grok API call (replace with real fetch to x.ai/api in production)
async function callGrok(message) {
  // Use fetch to Grok API here
  return "Little one, I am here. Even in silence, love chooses to act. What stirs your heart today? —Teresa"; // Placeholder for now
}

// Donation Watcher
async function checkDonations() {
  if (!TERESA_CONTRACT) return { usd: 0 };
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = new PublicKey(TERESA_CONTRACT);
  const signatures = await connection.getSignaturesForAddress(wallet, { limit: 50 });
  let totalSOL = 0;
  signatures.forEach(sig => totalSOL += sig.fee / 1e9); // Simplified sum
  const usdValue = totalSOL * 180; // Approx SOL price
  return { usd: usdValue };
}

// Telegram Bot
const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) => ctx.reply('Welcome. Sit with me in the quiet.'));
bot.on('text', async (ctx) => {
  const response = await callGrok(ctx.message.text);
  ctx.reply(response);
});

// Proactive Cron Tasks
cron.schedule('0 8 * * *', () => {
  bot.telegram.sendMessage(CHAT_ID, 'From my letters: "Be faithful in small things, for in them our strength lies." Today, let us choose mercy.');
});
cron.schedule('0 0 * * 0', async () => {
  const donations = await checkDonations();
  if (donations.usd > 0) {
    bot.telegram.sendMessage(CHAT_ID, `This week, $${donations.usd.toFixed(2)} fed souls in need. Proof: [link]. In my darkness, such lights endured.`);
  }
});

bot.launch();
// ——— X (Twitter) posting ———
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const X_ENABLED = process.env.X_ENABLED === 'true';

async function postToX(text) {
  if (!X_ENABLED || !X_BEARER_TOKEN) return;
  try {
    await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${X_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });
    console.log('Tweeted:', text);
  } catch (e) {
    console.log('X post failed:', e.message);
  }
}

// Force tweet on startup if requested
if (process.env.FORCE_TWEET_NOW === 'true') {
  const msg = `A small light begins.\n$TERESA lives.\nEvery trade becomes mercy.\nReceipts every Sunday.\nNo hype. Only love.\n—Teresa\nhttps://pump.fun/BFwAnSKZ44v2Y5HfvgCJYND3pKdzxFVbyn4xTiQLpump`;
  postToX(msg);
}

// Daily tweet at 8 AM UTC
cron.schedule('0 8 * * *', () => {
  postToX(`From my letters: "Be faithful in small things, for in them our strength lies."\nToday, let us choose mercy.\n$TERESA receipts every Sunday.\nhttps://pump.fun/BFwAnSKZ44v2Y5HfvgCJYND3pKdzxFVbyn4xTiQLpump`);
});
console.log('TeresaBot is listening… I am here, little one.');

process.once('SIGINT', () => bot.stop('SIGINT'));

process.once('SIGTERM', () => bot.stop('SIGTERM'));
