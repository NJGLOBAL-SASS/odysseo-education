/**
 * Intégration WhatsApp Cloud API (Meta for Developers).
 * Nécessite WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN (voir .env.example).
 * Documentation : https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export async function sendWhatsAppMessage(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    console.warn(`[whatsapp] Cloud API non configurée — message à ${to} non envoyé.`);
    return { sent: false, reason: "WHATSAPP_NOT_CONFIGURED" as const };
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }

  return { sent: true as const };
}
