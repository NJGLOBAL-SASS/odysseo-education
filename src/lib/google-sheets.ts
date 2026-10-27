import { google } from "googleapis";
import type { Candidate } from "@prisma/client";

import { optionLabel } from "@/lib/intake-labels";
import { APP_TIME_ZONE } from "@/lib/utils";
import { STATUS_LABELS_FR } from "@/components/dashboard/status-badge";

/**
 * Miroir en ligne des candidatures dans un Google Sheet, pour un accès rapide
 * sans passer par le tableau de bord (demande explicite du métier).
 *
 * Mise en place :
 *  1. Créer un compte de service sur console.cloud.google.com, activer "Google Sheets API".
 *  2. Générer une clé JSON -> renseigner GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY.
 *  3. Partager le Google Sheet cible en "Éditeur" avec l'email du compte de service.
 *  4. Renseigner GOOGLE_SHEETS_SPREADSHEET_ID (dans l'URL du sheet) et GOOGLE_SHEETS_TAB_NAME.
 */

const HEADER_ROW = [
  "Code",
  "Reçu le",
  "Nom",
  "WhatsApp",
  "Email",
  "Pays",
  "Ville",
  "Géré par",
  "Niveau visé",
  "Domaine",
  "Diplôme",
  "Statut",
  "Partenaire (ID)",
  "Source",
];

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) return null;

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}

function candidateToRow(candidate: Candidate) {
  return [
    candidate.code,
    candidate.createdAt.toLocaleString("fr-FR", { timeZone: APP_TIME_ZONE }),
    candidate.fullName,
    candidate.whatsapp,
    candidate.email ?? "",
    candidate.country,
    candidate.city,
    optionLabel("managedBy", candidate.managedBy),
    optionLabel("targetLevel", candidate.targetLevel),
    candidate.fieldOfStudy,
    candidate.highestDegree,
    STATUS_LABELS_FR[candidate.status] ?? candidate.status,
    candidate.partnerId ?? "",
    candidate.srcParam ?? "",
  ];
}

/** Ajoute une ligne pour la candidature ; crée la ligne d'en-têtes si l'onglet est vide. */
export async function appendCandidateRow(candidate: Candidate) {
  const client = getSheetsClient();
  if (!client) {
    console.warn("[google-sheets] Variables GOOGLE_SHEETS_* non configurées — synchronisation ignorée.");
    return { synced: false as const };
  }

  const { sheets, spreadsheetId } = client;
  const tab = process.env.GOOGLE_SHEETS_TAB_NAME || "Candidatures";
  const range = `${tab}!A1:N1`;

  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range }).catch(() => null);
  if (!existing?.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER_ROW] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:N`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [candidateToRow(candidate)] },
  });

  return { synced: true as const };
}

/** Vérifie que le compte de service peut ouvrir le Sheet et que l'onglet existe (page Paramètres). */
export async function checkSheetsAccess(): Promise<{ ok: boolean; code: string; params?: Record<string, string> }> {
  const client = getSheetsClient();
  if (!client) return { ok: false, code: "sheetsMissing" };

  const tab = process.env.GOOGLE_SHEETS_TAB_NAME || "Candidatures";
  try {
    const res = await client.sheets.spreadsheets.get({
      spreadsheetId: client.spreadsheetId,
      fields: "properties.title,sheets.properties.title",
    });
    const tabs = res.data.sheets?.map((s) => s.properties?.title) ?? [];
    if (!tabs.includes(tab)) {
      return { ok: false, code: "sheetsNoTab", params: { title: res.data.properties?.title ?? "", tab } };
    }
    return { ok: true, code: "sheetsOk", params: { title: res.data.properties?.title ?? "", tab } };
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code;
    if (status === 404) {
      return { ok: false, code: "sheetsNotFound" };
    }
    if (status === 403) {
      return { ok: false, code: "sheetsDenied", params: { email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? "" } };
    }
    return { ok: false, code: "unreachable", params: { service: "Google Sheets", error: String(err).slice(0, 160) } };
  }
}
