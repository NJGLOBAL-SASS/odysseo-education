import { publicSiteUrl } from "@/lib/referral";

/**
 * Envoi d'email via l'API transactionnelle Brevo (ex-Sendinblue).
 * Documentation : https://developers.brevo.com/reference/sendtransacemail
 * La clé API commence par "xkeysib-" (et non "xsmtpsib-", qui est une clé SMTP).
 */
export type EmailAttachment = { name: string; content: string /* base64 */ };

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts: { attachments?: EmailAttachment[]; replyTo?: { email: string; name?: string } } = {}
) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.warn(`[email] BREVO_API_KEY non configurée — email à ${to} non envoyé ("${subject}").`);
    return { sent: false as const, reason: "BREVO_API_KEY non configurée" };
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
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      ...(opts.attachments?.length ? { attachment: opts.attachments } : {}),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${error}`);
  }

  return { sent: true as const };
}

export type HealthResult = { ok: boolean; code: string; params?: Record<string, string | number> };

/** Vérifie la clé Brevo sans envoyer d'email (page Paramètres ; texte traduit côté page). */
export async function checkBrevoAccount(): Promise<HealthResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false, code: "brevoMissing" };
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, code: "brevoRejected", params: { reason: String(json.message ?? res.status) } };
    const plan = (json.plan as { type: string; credits: number }[] | undefined)?.[0];
    return plan
      ? { ok: true, code: "brevoActive", params: { type: plan.type, credits: plan.credits } }
      : { ok: true, code: "brevoActiveNoCredits" };
  } catch (err) {
    return { ok: false, code: "unreachable", params: { service: "Brevo", error: String(err).slice(0, 160) } };
  }
}

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Gabarit commun aux emails (charte Odysseo : noir / rouge / blanc).
 * `bodyHtml` doit déjà être échappé ; utiliser `escapeHtml` sur toute donnée saisie.
 */
export function emailLayout({
  title,
  intro,
  bodyHtml,
  cta,
  footer = "Odysseo Education — message automatique, merci de ne pas y répondre directement.",
}: {
  title: string;
  intro?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footer?: string;
}) {
  const logo = `${publicSiteUrl()}/images/logo/logo-full-white-tight.png`;
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#F4F4F6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0B0B0D">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden">
        <tr><td style="background:#0B0B0D;padding:18px 24px">
          <img src="${logo}" alt="Odysseo Education" height="28" style="display:block;height:28px;width:auto" />
        </td></tr>
        <tr><td style="height:3px;background:#FF0000;line-height:3px;font-size:0">&nbsp;</td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:800">${escapeHtml(title)}</h1>
          ${intro ? `<p style="margin:0 0 16px;font-size:15px;color:#5B5B66">${escapeHtml(intro)}</p>` : ""}
          ${bodyHtml}
          ${
            cta
              ? `<p style="margin:24px 0 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#FF0000;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(cta.label)}</a></p>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid #E3E3E8;font-size:12px;color:#5B5B66">
          ${escapeHtml(footer)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Tableau label / valeur pour le corps d'un email. */
export function emailRows(rows: [string, string | number | null | undefined][]) {
  const cells = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #EFEFF2;color:#5B5B66;font-size:14px;width:42%">${escapeHtml(label)}</td><td style="padding:8px 0;border-bottom:1px solid #EFEFF2;font-size:14px;font-weight:600">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>`;
}

/** Texte saisi par l'équipe (sans mise en forme) → paragraphes HTML échappés. */
export function textToHtml(text: string) {
  return escapeHtml(text.trim())
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#0B0B0D">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Mise en forme e-mail du HTML (déjà nettoyé) produit par l'éditeur du dashboard. */
export function styleRichHtml(html: string) {
  return html
    .replace(/<p>/g, '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#0B0B0D">')
    .replace(/<div>/g, '<div style="font-size:15px;line-height:1.6;color:#0B0B0D">')
    .replace(/<h2>/g, '<h2 style="margin:18px 0 8px;font-size:18px;font-weight:800">')
    .replace(/<h3>/g, '<h3 style="margin:16px 0 6px;font-size:16px;font-weight:700">')
    .replace(/<ul>/g, '<ul style="margin:0 0 12px;padding-left:22px;font-size:15px;line-height:1.6">')
    .replace(/<ol>/g, '<ol style="margin:0 0 12px;padding-left:22px;font-size:15px;line-height:1.6">')
    .replace(/<blockquote>/g, '<blockquote style="margin:0 0 12px;padding:8px 14px;border-left:3px solid #FF0000;background:#F4F4F6;color:#5B5B66">')
    .replace(/<a href=/g, '<a style="color:#D60000;font-weight:600" href=');
}
