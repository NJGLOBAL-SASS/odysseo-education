/* eslint-disable react/no-unescaped-entities -- contenu juridique en prose française/anglaise */
import { setRequestLocale } from "next-intl/server";

import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { ManageCookiesButton } from "@/components/cookies/manage-cookies-button";

const LAST_UPDATED = "24 octobre 2026";

const ROWS = [
  {
    name: "odysseo_cookie_consent",
    type: { fr: "Stockage local (localStorage)", en: "Local storage" },
    purpose: { fr: "Mémorise vos choix de cookies", en: "Remembers your cookie choices" },
    duration: { fr: "Jusqu'à modification", en: "Until changed" },
    category: { fr: "Nécessaire", en: "Necessary" },
  },
  {
    name: "odysseo_anon_id",
    type: { fr: "Stockage local (localStorage)", en: "Local storage" },
    purpose: {
      fr: "Identifiant anonyme pour la preuve de consentement",
      en: "Anonymous ID for consent proof",
    },
    duration: { fr: "Jusqu'à suppression du navigateur", en: "Until browser data is cleared" },
    category: { fr: "Nécessaire", en: "Necessary" },
  },
  {
    name: "odysseo_ref / odysseo_src",
    type: { fr: "Stockage de session (sessionStorage)", en: "Session storage" },
    purpose: {
      fr: "Mémorise le code partenaire qui vous a orienté, le temps de la visite",
      en: "Remembers the partner code that referred you, for the current visit",
    },
    duration: { fr: "Fermeture de l'onglet", en: "Until the tab is closed" },
    category: { fr: "Nécessaire", en: "Necessary" },
  },
  {
    name: "authjs.session-token",
    type: { fr: "Cookie (team.odysseo-education.com uniquement)", en: "Cookie (team.odysseo-education.com only)" },
    purpose: {
      fr: "Maintient la session connectée de l'équipe sur le tableau de bord",
      en: "Keeps staff signed in on the dashboard",
    },
    duration: { fr: "Session / 30 jours selon connexion", en: "Session / 30 days depending on login" },
    category: { fr: "Nécessaire", en: "Necessary" },
  },
];

export default function CookiePolicyPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const isFr = params.locale !== "en";

  if (!isFr) {
    return (
      <LegalPageShell title="Cookie Policy" updatedAt={`Last updated: ${LAST_UPDATED}`}>
        <LegalSection title="1. What is a cookie">
          <p>
            A cookie is a small file stored on your device when you visit a website. We also
            use similar browser storage technologies (localStorage, sessionStorage) for the
            same purposes.
          </p>
        </LegalSection>

        <LegalSection title="2. Categories we use">
          <ul>
            <li><strong>Necessary</strong> — required for the site and form to work. Always active.</li>
            <li><strong>Analytics</strong> — would measure site usage. Not activated by default; only enabled with your consent, and no analytics tool is connected yet on this version of the site.</li>
            <li><strong>Marketing</strong> — would personalize offers. Same as above: available as a consent category, not yet connected to a specific tool.</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Cookies and storage we currently use">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-bord text-texte">
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 pr-3 font-semibold">Purpose</th>
                  <th className="py-2 pr-3 font-semibold">Duration</th>
                  <th className="py-2 font-semibold">Category</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.name} className="border-b border-bord align-top">
                    <td className="py-2 pr-3 font-mono">{r.name}</td>
                    <td className="py-2 pr-3">{r.type.en}</td>
                    <td className="py-2 pr-3">{r.purpose.en}</td>
                    <td className="py-2 pr-3">{r.duration.en}</td>
                    <td className="py-2">{r.category.en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LegalSection>

        <LegalSection title="4. Managing your choices">
          <p>
            You can change your cookie preferences at any time using the button below, or
            through your browser settings.
          </p>
          <ManageCookiesButton className="btn-dark !w-auto">
            Manage my cookie preferences
          </ManageCookiesButton>
        </LegalSection>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell title="Politique de cookies" updatedAt={`Dernière mise à jour : ${LAST_UPDATED}`}>
      <LegalSection title="1. Qu'est-ce qu'un cookie">
        <p>
          Un cookie est un petit fichier déposé sur votre appareil lors de la visite d'un
          site. Nous utilisons aussi des technologies de stockage similaires du navigateur
          (localStorage, sessionStorage) pour les mêmes finalités.
        </p>
      </LegalSection>

      <LegalSection title="2. Les catégories que nous utilisons">
        <ul>
          <li><strong>Nécessaires</strong> — indispensables au fonctionnement du site et du formulaire. Toujours actifs.</li>
          <li><strong>Mesure d'audience</strong> — permettraient de mesurer la fréquentation du site. Non activés par défaut ; uniquement activés avec votre accord, et aucun outil de mesure d'audience n'est encore connecté dans cette version du site.</li>
          <li><strong>Marketing</strong> — permettraient de personnaliser des offres. Même principe : catégorie disponible au consentement, pas encore reliée à un outil précis.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Cookies et stockages actuellement utilisés">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-bord text-texte">
                <th className="py-2 pr-3 font-semibold">Nom</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Finalité</th>
                <th className="py-2 pr-3 font-semibold">Durée</th>
                <th className="py-2 font-semibold">Catégorie</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.name} className="border-b border-bord align-top">
                  <td className="py-2 pr-3 font-mono">{r.name}</td>
                  <td className="py-2 pr-3">{r.type.fr}</td>
                  <td className="py-2 pr-3">{r.purpose.fr}</td>
                  <td className="py-2 pr-3">{r.duration.fr}</td>
                  <td className="py-2">{r.category.fr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="4. Gérer vos choix">
        <p>
          Vous pouvez modifier vos préférences de cookies à tout moment grâce au bouton
          ci-dessous, ou via les réglages de votre navigateur.
        </p>
        <ManageCookiesButton className="btn-dark !w-auto">
          Gérer mes préférences de cookies
        </ManageCookiesButton>
      </LegalSection>
    </LegalPageShell>
  );
}
