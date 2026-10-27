/* eslint-disable react/no-unescaped-entities -- contenu juridique en prose française/anglaise */
import { setRequestLocale } from "next-intl/server";

import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { Link } from "@/i18n/navigation";

const LAST_UPDATED = { fr: "27 octobre 2026", en: "October 27, 2026" };
const CONTACT = "contact.odysseo@gmail.com";

export default function PrivacyPolicyPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const isFr = params.locale !== "en";
  const mail = <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;

  if (!isFr) {
    return (
      <LegalPageShell title="Privacy Policy" updatedAt={`Last updated: ${LAST_UPDATED.en}`}>
        <LegalSection title="1. Who we are">
          <p>
            <strong>Odysseo Education</strong> operates this website and helps students prepare their applications to
            study, work or settle in China. Odysseo Education is the controller of the personal data described below. For
            any question about this policy, contact us at {mail}.
          </p>
        </LegalSection>

        <LegalSection title="2. What data we collect">
          <ul>
            <li>
              <strong>Application form</strong> (<Link href="/postuler">/postuler</Link>): full name, WhatsApp number,
              <strong> email address</strong>, date of birth, country/city, parent or guardian details (if you are a minor
              or declare one), academic background, study project, passport status, English level, funding plan, how you
              found us and, if relevant, the partner who referred you.
            </li>
            <li>
              <strong>Partnership request</strong> (<Link href="/partenaires">/partenaires</Link>): full name, email,
              WhatsApp number, country/city, profile and motivation message, then our decision and the reply sent to you.
            </li>
            <li>
              <strong>Communications</strong>: the emails our team writes to you from our dashboard (subject, message,
              names of attached files) and a delivery log of every notification (recipient, channel, date, status).
            </li>
            <li>
              <strong>Referral tracking</strong>: when you arrive through a partner link, the partner code, the date of
              the click and your browser's user agent (no IP address is stored).
            </li>
            <li>
              <strong>Newsletter</strong>: your email address and preferred language.
            </li>
            <li>
              <strong>Team dashboard</strong> (staff only): name, login email, role, password hash, optional Google
              sign-in, encrypted two-factor (TOTP) secret, notification preferences and push-notification subscriptions.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Why we use it, and on what basis">
          <ul>
            <li>
              <strong>Reviewing your application and following it up</strong> — including all exchanges about your file —
              on the basis of the pre-contractual steps you request and your consent given in the form.
            </li>
            <li>
              <strong>Your contact channels</strong>: all information about your application is sent to you{" "}
              <strong>only on the WhatsApp number and email address you provided</strong>. Please keep them up to date.
            </li>
            <li>
              <strong>Reviewing partnership requests</strong> and running the partner program (crediting referral points),
              on the basis of your request and our legitimate interest in rewarding referrals fairly.
            </li>
            <li>Sending the newsletter, on the basis of your consent (you can unsubscribe at any time).</li>
            <li>
              Securing the team dashboard (authentication, two-factor verification, access logs), on the basis of our
              legitimate interest in protecting the data entrusted to us.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Who receives your data">
          <p>Only the Odysseo Education team, and the providers strictly needed to run the service:</p>
          <ul>
            <li><strong>Vercel</strong> (hosting of the website and dashboard).</li>
            <li><strong>Neon</strong> (PostgreSQL database hosting).</li>
            <li><strong>Brevo</strong> (sending of transactional emails, including emails written by our team).</li>
            <li><strong>Google</strong> (private staff-only Google Sheets copy of applications; optional Google sign-in for staff).</li>
            <li><strong>Meta — WhatsApp Cloud API</strong> (WhatsApp notifications to the team).</li>
            <li>Your browser's push service (Google, Mozilla, Apple), for staff push notifications only.</li>
          </ul>
          <p>
            Some of these providers are located outside your country, including in the United States; they act on our
            instructions and under their own data-protection commitments. We never sell your personal data.
          </p>
        </LegalSection>

        <LegalSection title="5. How long we keep it">
          <ul>
            <li>Application data and related emails: for the duration of your application process, then for a reasonable follow-up and archiving period.</li>
            <li>Partnership requests: for the duration of the partnership; declined requests for up to 12 months after the decision.</li>
            <li>Referral click logs: while the partner account exists.</li>
            <li>Newsletter: until you unsubscribe.</li>
            <li>Notification delivery logs: kept as a technical record for troubleshooting.</li>
          </ul>
          <p>You can ask for earlier deletion at any time (section 7).</p>
        </LegalSection>

        <LegalSection title="6. Security">
          <p>
            Passwords are hashed, password-reset links are single-use and expire after one hour, staff accounts support
            two-factor authentication, and the dashboard is only reachable on a separate team domain. Data cached on a
            staff device for offline use is erased at sign-out.
          </p>
        </LegalSection>

        <LegalSection title="7. Your rights">
          <p>
            You can request access to, correction or deletion of your data, ask for its portability, object to or
            restrict its use, and withdraw your consent at any time, by writing to {mail}. You may also lodge a complaint
            with your data-protection authority.
          </p>
        </LegalSection>

        <LegalSection title="8. Cookies">
          <p>
            Details of the cookies and similar technologies we use are in our <Link href="/cookies">Cookie Policy</Link>.
          </p>
        </LegalSection>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell title="Politique de confidentialité" updatedAt={`Dernière mise à jour : ${LAST_UPDATED.fr}`}>
      <LegalSection title="1. Qui sommes-nous">
        <p>
          <strong>Odysseo Education</strong> édite ce site et accompagne les étudiants dans leurs démarches d'études, de
          travail ou d'installation en Chine. Odysseo Education est responsable du traitement des données décrites
          ci-dessous. Pour toute question sur cette politique, écrivez-nous à {mail}.
        </p>
      </LegalSection>

      <LegalSection title="2. Quelles données nous collectons">
        <ul>
          <li>
            <strong>Formulaire de candidature</strong> (<Link href="/postuler">/postuler</Link>) : nom et prénom, numéro
            WhatsApp, <strong>adresse email</strong>, date de naissance, pays/ville, coordonnées du parent ou tuteur (si
            vous êtes mineur ou en déclarez un), parcours scolaire, projet d'études, statut du passeport, niveau
            d'anglais, mode de financement, la façon dont vous nous avez connus et, le cas échéant, le partenaire qui
            vous a orienté.
          </li>
          <li>
            <strong>Demande de partenariat</strong> (<Link href="/partenaires">/partenaires</Link>) : nom et prénom, email,
            numéro WhatsApp, pays/ville, profil et message de motivation, puis notre décision et la réponse qui vous est
            envoyée.
          </li>
          <li>
            <strong>Échanges</strong> : les emails que notre équipe vous écrit depuis son tableau de bord (objet, message,
            noms des pièces jointes) et un journal d'envoi de chaque notification (destinataire, canal, date, statut).
          </li>
          <li>
            <strong>Suivi du parrainage</strong> : si vous arrivez par le lien d'un partenaire, le code de ce partenaire,
            la date du clic et l'identifiant de votre navigateur (aucune adresse IP n'est conservée).
          </li>
          <li>
            <strong>Newsletter</strong> : votre adresse email et votre langue préférée.
          </li>
          <li>
            <strong>Tableau de bord de l'équipe</strong> (personnel uniquement) : nom, email de connexion, rôle, mot de
            passe haché, connexion Google facultative, secret de double authentification (TOTP) chiffré, préférences de
            notification et abonnements aux notifications push.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Pourquoi nous les utilisons, et sur quelle base">
        <ul>
          <li>
            <strong>Étudier votre dossier et en assurer le suivi</strong> — y compris tous les échanges qui le
            concernent —, sur la base des démarches précontractuelles que vous demandez et du consentement donné dans le
            formulaire.
          </li>
          <li>
            <strong>Vos canaux de contact</strong> : toutes les informations liées à votre procédure vous sont
            communiquées <strong>uniquement sur le numéro WhatsApp et l'adresse email que vous avez indiqués</strong>.
            Pensez à les tenir à jour.
          </li>
          <li>
            <strong>Étudier les demandes de partenariat</strong> et faire fonctionner le programme partenaires (crédit
            des points de parrainage), sur la base de votre demande et de notre intérêt légitime à récompenser
            équitablement les recommandations.
          </li>
          <li>Vous envoyer la newsletter, sur la base de votre consentement (désinscription possible à tout moment).</li>
          <li>
            Sécuriser le tableau de bord de l'équipe (authentification, double facteur, journaux d'accès), sur la base de
            notre intérêt légitime à protéger les données qui nous sont confiées.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Qui reçoit vos données">
        <p>Uniquement l'équipe Odysseo Education et les prestataires strictement nécessaires au service :</p>
        <ul>
          <li><strong>Vercel</strong> (hébergement du site et du tableau de bord).</li>
          <li><strong>Neon</strong> (hébergement de la base de données PostgreSQL).</li>
          <li><strong>Brevo</strong> (envoi des emails, y compris ceux rédigés par notre équipe).</li>
          <li><strong>Google</strong> (copie privée des candidatures dans Google Sheets, réservée à l'équipe ; connexion Google facultative de l'équipe).</li>
          <li><strong>Meta — WhatsApp Cloud API</strong> (alertes WhatsApp envoyées à l'équipe).</li>
          <li>Le service push de votre navigateur (Google, Mozilla, Apple), uniquement pour les notifications de l'équipe.</li>
        </ul>
        <p>
          Certains de ces prestataires sont situés hors de votre pays, notamment aux États-Unis ; ils agissent sur nos
          instructions et selon leurs propres engagements de protection des données. Nous ne vendons jamais vos données
          personnelles.
        </p>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <ul>
          <li>Dossier de candidature et emails associés : pendant la durée de votre procédure, puis pendant une durée raisonnable de suivi et d'archivage.</li>
          <li>Demandes de partenariat : pendant toute la durée du partenariat ; demandes refusées jusqu'à 12 mois après la décision.</li>
          <li>Journal des clics de parrainage : tant que le compte partenaire existe.</li>
          <li>Newsletter : jusqu'à votre désinscription.</li>
          <li>Journal des notifications : conservé comme trace technique pour le diagnostic des envois.</li>
        </ul>
        <p>Vous pouvez demander une suppression anticipée à tout moment (section 7).</p>
      </LegalSection>

      <LegalSection title="6. Sécurité">
        <p>
          Les mots de passe sont hachés, les liens de réinitialisation sont à usage unique et expirent au bout d'une
          heure, les comptes de l'équipe peuvent activer la double authentification et le tableau de bord n'est
          accessible que sur un domaine distinct réservé à l'équipe. Les données mises en cache sur un appareil de
          l'équipe pour l'usage hors-ligne sont effacées à la déconnexion.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Vous pouvez demander l'accès, la rectification ou la suppression de vos données, leur portabilité, vous opposer
          à leur utilisation ou en demander la limitation, et retirer votre consentement à tout moment, en écrivant à{" "}
          {mail}. Vous pouvez également introduire une réclamation auprès de l'autorité de protection des données
          compétente.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Le détail des cookies et technologies similaires que nous utilisons figure dans notre{" "}
          <Link href="/cookies">politique de cookies</Link>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
