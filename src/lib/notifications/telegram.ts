/**
 * Alerte Telegram du groupe de l'équipe (PACK-12 Lot D) : TELEGRAM_BOT_TOKEN (@BotFather)
 * + TELEGRAM_CHAT_ID (groupe, nombre négatif ; `npm run telegram:chat-id`). Variable
 * manquante : canal ignoré (SKIPPED), sans erreur.
 */
export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false as const, reason: "Telegram non configuré (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)" };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Texte brut : aucun risque d'interprétation Markdown des noms ou numéros.
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return { sent: true as const };
}
