import { google } from "googleapis";
import type { Candidate } from "@prisma/client";

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
  "Pays",
  "Ville",
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
    candidate.createdAt.toISOString(),
    candidate.fullName,
    candidate.whatsapp,
    candidate.country,
    candidate.city,
    candidate.targetLevel,
    candidate.fieldOfStudy,
    candidate.highestDegree,
    candidate.status,
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
  const range = `${tab}!A1:L1`;

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
    range: `${tab}!A:L`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [candidateToRow(candidate)] },
  });

  return { synced: true as const };
}
