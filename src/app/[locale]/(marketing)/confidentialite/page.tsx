/* eslint-disable react/no-unescaped-entities -- contenu juridique en prose française/anglaise */
import { setRequestLocale } from "next-intl/server";

import {
  LegalPageShell,
  LegalSection,
} from "@/components/legal/legal-page-shell";
import { Link } from "@/i18n/navigation";

const LAST_UPDATED = "24 octobre 2026";

export default function PrivacyPolicyPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const isFr = params.locale !== "en";

  if (!isFr) {
    return (
      <LegalPageShell
        title="Privacy Policy"
        updatedAt={`Last updated: ${LAST_UPDATED}`}
      >
        <LegalSection title="1. Who we are">
          <p>
            <strong>Odysseo Education</strong> operates this website and helps
            students prepare their applications to study, work or settle in
            China. For any question about this policy, contact us at{" "}
            <a href="mailto:contact.odysseo@gmail.com">
              contact.odysseo@gmail.com
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection title="2. What data we collect">
          <p>Depending on how you interact with the site, we collect:</p>
          <ul>
            <li>
              <strong>Application form</strong> (
              <Link href="/postuler">/postuler</Link>): full name, WhatsApp
              number, date of birth, country/city, guardian details (if you are
              a minor or declare one), academic background, study project,
              passport status, English level, funding plan, and — if relevant —
              the partner code who referred you.
            </li>
            <li>
              <strong>Newsletter</strong>: your email address and preferred
              language.
            </li>
            <li>
              <strong>Cookies</strong>: see our{" "}
              <Link href="/cookies">Cookie Policy</Link> for the full list.
            </li>
            <li>
              <strong>Team dashboard</strong> (staff only, on the separate
              team.odysseo-education.com domain): login email, and — if you
              enable two-factor authentication — an encrypted TOTP secret.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Why we use your data">
          <ul>
            <li>
              Reviewing your application and contacting you on WhatsApp about
              it.
            </li>
            <li>
              Tracking which partner referred you, to credit their referral
              points.
            </li>
            <li>Sending you the newsletter, if you subscribed to it.</li>
            <li>
              Sending transactional notifications (new application confirmation,
              status updates) by email, WhatsApp or browser push.
            </li>
            <li>
              Securing the staff dashboard (authentication, two-factor
              verification).
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Who we share data with">
          <p>We only share what is necessary to run the service, with:</p>
          <ul>
            <li>
              <strong>Brevo</strong> — sends transactional emails on our behalf.
            </li>
            <li>
              <strong>Meta (WhatsApp Cloud API)</strong> — delivers WhatsApp
              notifications.
            </li>
            <li>
              <strong>Google Sheets</strong> — a private, staff-only spreadsheet
              mirrors application data for quick internal access, in addition to
              our main database.
            </li>
          </ul>
          <p>We never sell your personal data.</p>
        </LegalSection>

        <LegalSection title="5. How long we keep it">
          <p>
            Application data is kept for the duration of your candidacy process
            and for a reasonable period afterwards for follow-up and
            record-keeping. Newsletter addresses are kept until you unsubscribe.
            You can request earlier deletion at any time (see section 7).
          </p>
        </LegalSection>

        <LegalSection title="6. Security">
          <p>
            Passwords are hashed, staff accounts support two-factor
            authentication, and access to the dashboard is restricted to the
            team.odysseo-education.com domain, separate from the public site.
          </p>
        </LegalSection>

        <LegalSection title="7. Your rights">
          <p>
            You can request access to, correction of, or deletion of your
            personal data, or object to its use, by writing to{" "}
            <a href="mailto:contact.odysseo@gmail.com">
              contact.odysseo@gmail.com
            </a>
            . We will respond within a reasonable timeframe.
          </p>
        </LegalSection>

        <LegalSection title="8. Cookies">
          <p>
            Full detail of the cookies and similar technologies we use is
            available in our <Link href="/cookies">Cookie Policy</Link>.
          </p>
        </LegalSection>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell
      title="Politique de confidentialité"
      updatedAt={`Dernière mise à jour : ${LAST_UPDATED}`}
    >
      <LegalSection title="1. Qui sommes-nous">
        <p>
          <strong>Odysseo Education</strong> édite ce site et accompagne les
          étudiants dans leurs démarches d'études, de travail ou d'installation
          en Chine. Pour toute question sur cette politique, contactez-nous à{" "}
          <a href="mailto:contact.odysseo@gmail.com">
            contact.odysseo@gmail.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Quelles données nous collectons">
        <p>Selon votre usage du site, nous collectons :</p>
        <ul>
          <li>
            <strong>Formulaire de candidature</strong> (
            <Link href="/postuler">/postuler</Link>) : nom et prénom, numéro
            WhatsApp, date de naissance, pays/ville, coordonnées du parent ou
            tuteur (si vous êtes mineur ou en déclarez un), parcours scolaire,
            projet d'études, statut du passeport, niveau d'anglais, mode de
            financement et, le cas échéant, le code du partenaire qui vous a
            orienté.
          </li>
          <li>
            <strong>Newsletter</strong> : votre adresse email et votre langue
            préférée.
          </li>
          <li>
            <strong>Cookies</strong> : voir notre{" "}
            <Link href="/cookies">politique de cookies</Link> pour la liste
            complète.
          </li>
          <li>
            <strong>Tableau de bord équipe</strong> (réservé au personnel, sur
            le domaine séparé team.odysseo-education.com) : email de connexion
            et, si vous activez la double authentification, un secret TOTP
            chiffré.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Pourquoi nous utilisons vos données">
        <ul>
          <li>
            Étudier votre dossier et vous contacter sur WhatsApp à son sujet.
          </li>
          <li>
            Identifier le partenaire qui vous a orienté, pour créditer ses
            points de parrainage.
          </li>
          <li>Vous envoyer la newsletter, si vous y êtes abonné·e.</li>
          <li>
            Vous envoyer des notifications transactionnelles (confirmation de
            dossier, changement de statut) par email, WhatsApp ou notification
            push.
          </li>
          <li>
            Sécuriser l'accès au tableau de bord de l'équipe (authentification,
            double facteur).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Avec qui nous partageons vos données">
        <p>
          Nous ne partageons que le strict nécessaire au fonctionnement du
          service, avec :
        </p>
        <ul>
          <li>
            <strong>Brevo</strong> — envoie les emails transactionnels en notre
            nom.
          </li>
          <li>
            <strong>Meta (WhatsApp Cloud API)</strong> — achemine les
            notifications WhatsApp.
          </li>
          <li>
            <strong>Google Sheets</strong> — un tableur privé, réservé à
            l'équipe, reçoit une copie des candidatures pour un accès rapide, en
            complément de notre base de données principale.
          </li>
        </ul>
        <p>Nous ne vendons jamais vos données personnelles.</p>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <p>
          Les données de candidature sont conservées pendant la durée de votre
          dossier puis pour une durée raisonnable à des fins de suivi et
          d'archivage. Les adresses de la newsletter sont conservées jusqu'à
          désabonnement. Vous pouvez demander une suppression anticipée à tout
          moment (voir section 7).
        </p>
      </LegalSection>

      <LegalSection title="6. Sécurité">
        <p>
          Les mots de passe sont hachés, les comptes de l'équipe peuvent activer
          la double authentification, et l'accès au tableau de bord est limité
          au domaine team.odysseo-education.com, distinct du site public.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Vous pouvez demander l'accès, la rectification ou la suppression de
          vos données personnelles, ou vous opposer à leur utilisation, en
          écrivant à{" "}
          <a href="mailto:contact.odysseo@gmail.com">
            contact@odysseo-education.com
          </a>
          . Nous vous répondrons dans un délai raisonnable.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Le détail des cookies et technologies similaires que nous utilisons
          figure dans notre <Link href="/cookies">politique de cookies</Link>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
