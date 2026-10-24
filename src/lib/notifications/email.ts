/**
 * Envoi d'email via l'API transactionnelle Brevo (ex-Sendinblue).
 * Documentation : https://developers.brevo.com/reference/sendtransacemail
 */
export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.warn(`[email] BREVO_API_KEY non configurée — email à ${to} non envoyé ("${subject}").`);
    return { sent: false, reason: "BREVO_NOT_CONFIGURED" as const };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || "no-reply@odysseo-education.com",
        name: process.env.BREVO_SENDER_NAME || "Odysseo Education",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${error}`);
  }

  return { sent: true as const };
}
