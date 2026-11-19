// PACK-12 : affiche les groupes Telegram vus par le bot, pour trouver TELEGRAM_CHAT_ID.
// 1. Ajoutez le bot au groupe de l'équipe et écrivez un message dans le groupe.
// 2. TELEGRAM_BOT_TOKEN=... npm run telegram:chat-id
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN manquant. Exemple : TELEGRAM_BOT_TOKEN=123:ABC npm run telegram:chat-id");
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const json = await res.json();
if (!json.ok) {
  console.error("Réponse Telegram :", json.description ?? json);
  process.exit(1);
}
const chats = new Map();
for (const u of json.result ?? []) {
  const chat = (u.message ?? u.my_chat_member ?? u.channel_post)?.chat;
  if (chat) chats.set(chat.id, `${chat.title ?? chat.username ?? chat.first_name ?? "?"} (${chat.type})`);
}
if (chats.size === 0) console.log("Aucun groupe trouvé : écrivez un message dans le groupe après y avoir ajouté le bot, puis relancez.");
for (const [id, label] of chats) console.log(`TELEGRAM_CHAT_ID=${id}   ← ${label}`);
