/* eslint-disable react/no-unescaped-entities -- contenu juridique en prose française/anglaise */
import { setRequestLocale } from "next-intl/server";

import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { Link } from "@/i18n/navigation";

const LAST_UPDATED = { fr: "27 octobre 2026", en: "October 27, 2026" };

export default function TermsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const isFr = params.locale !== "en";

  if (!isFr) {
    return (
      <LegalPageShell title="Terms of Use" updatedAt={`Last updated: ${LAST_UPDATED.en}`}>
        <LegalSection title="1. Purpose">
          <p>
            These terms govern the use of the Odysseo Education website and of the support
            service for studying, working or settling in China (orientation, scholarship
            search, application file, visa support).
          </p>
        </LegalSection>

        <LegalSection title="2. No guaranteed outcome">
          <p>
            Odysseo Education only submits complete, verified application files, but cannot
            guarantee admission. Scholarship award depends on criteria outside our control
            (academic results, interview, number of places, university choice). Visa
            decisions belong exclusively to the consular authorities. See our{" "}
            <Link href="/services">services page</Link> for the full detail of what we do and
            do not guarantee.
          </p>
        </LegalSection>

        <LegalSection title="3. Application form">
          <p>
            By submitting the form at <Link href="/postuler">/postuler</Link>, you confirm
            that the information provided is accurate and that you consent to Odysseo
            Education processing it to review your application and contact you on WhatsApp
            and by email, as described in our <Link href="/confidentialite">Privacy Policy</Link>.
          </p>
          <p>
            <strong>Contact channels.</strong> All information about your application
            (progress, documents to provide, proposals) is sent only to the WhatsApp number
            and the email address you provided. You are responsible for keeping them accurate
            and for checking them regularly, including your spam folder.
          </p>
        </LegalSection>

        <LegalSection title="4. Partner program">
          <p>
            Anyone can apply to become a partner through the form on the{" "}
            <Link href="/partenaires">partners page</Link>. The Odysseo Education team reviews
            each request and replies by email; it may accept or decline a request at its
            discretion. Once accepted, the partner receives a personal code and link.
          </p>
          <p>
            Partners receive points when a candidate who applied through their link or code
            submits a complete application, is qualified, or is enrolled. Points have no cash
            value and are not transferable. Partners undertake to present Odysseo Education
            honestly, never to promise an admission, scholarship or visa, and not to send
            unsolicited mass messages. Odysseo Education may adjust the points schedule, or
            suspend or close a partner account in case of abusive or fraudulent use (e.g.
            fake submissions).
          </p>
        </LegalSection>

        <LegalSection title="5. Fair use">
          <p>
            Automated, abusive or fraudulent use of the form (bots, mass fake submissions) is
            prohibited and may result in the submission being discarded or the associated
            partner account being suspended.
          </p>
        </LegalSection>

        <LegalSection title="6. Changes">
          <p>
            Odysseo Education may update these terms at any time; the version published on
            this page is the one in force.
          </p>
        </LegalSection>

        <LegalSection title="7. Governing law">
          <p>These terms are governed by the laws of [country — to complete].</p>
        </LegalSection>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell title="Conditions générales d'utilisation" updatedAt={`Dernière mise à jour : ${LAST_UPDATED.fr}`}>
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions encadrent l'utilisation du site Odysseo Education et du
          service d'accompagnement aux études, au travail ou à l'installation en Chine
          (orientation, recherche de bourse, constitution de dossier, accompagnement visa).
        </p>
      </LegalSection>

      <LegalSection title="2. Absence de garantie de résultat">
        <p>
          Odysseo Education ne dépose que des dossiers complets et vérifiés, sans pouvoir
          garantir une admission. L'attribution d'une bourse dépend de critères que nous ne
          contrôlons pas (résultats scolaires, entretien, nombre de places, choix de
          l'université). La décision finale sur le visa revient exclusivement aux autorités
          consulaires. Voir notre <Link href="/services">page services</Link> pour le détail
          complet de ce que nous garantissons et ne garantissons pas.
        </p>
      </LegalSection>

      <LegalSection title="3. Formulaire de candidature">
        <p>
          En soumettant le formulaire sur <Link href="/postuler">/postuler</Link>, vous
          confirmez l'exactitude des informations fournies et consentez à ce qu'Odysseo
          Education les traite pour étudier votre dossier et vous contacter sur WhatsApp et
          par email, comme décrit dans notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
        <p>
          <strong>Canaux de contact.</strong> Toutes les informations liées à votre procédure
          (avancement du dossier, documents à fournir, propositions) vous sont communiquées
          uniquement sur le numéro WhatsApp et l'adresse email que vous avez indiqués. Il vous
          appartient de les tenir exacts et de les consulter régulièrement, y compris le
          dossier des courriers indésirables.
        </p>
      </LegalSection>

      <LegalSection title="4. Programme partenaires">
        <p>
          Toute personne peut demander à devenir partenaire via le formulaire de la{" "}
          <Link href="/partenaires">page partenaires</Link>. L'équipe Odysseo Education
          étudie chaque demande et répond par email ; elle peut l'accepter ou la refuser
          librement. Une fois accepté, le partenaire reçoit un code et un lien personnels.
        </p>
        <p>
          Les partenaires reçoivent des points lorsqu'un candidat venu par leur lien ou leur
          code soumet un dossier complet, est qualifié, ou est admis. Les points n'ont aucune
          valeur monétaire et ne sont pas transférables. Le partenaire s'engage à présenter
          Odysseo Education de façon loyale, à ne jamais promettre une admission, une bourse
          ou un visa, et à ne pas envoyer de messages de masse non sollicités. Odysseo
          Education peut ajuster le barème de points, suspendre ou clôturer un compte
          partenaire en cas d'usage abusif ou frauduleux (ex. fausses soumissions).
        </p>
      </LegalSection>

      <LegalSection title="5. Usage loyal">
        <p>
          Toute utilisation automatisée, abusive ou frauduleuse du formulaire (robots,
          soumissions massives fictives) est interdite et peut entraîner le rejet de la
          soumission ou la suspension du compte partenaire associé.
        </p>
      </LegalSection>

      <LegalSection title="6. Modifications">
        <p>
          Odysseo Education peut mettre à jour ces conditions à tout moment ; la version
          publiée sur cette page fait foi.
        </p>
      </LegalSection>

      <LegalSection title="7. Droit applicable">
        <p>Les présentes conditions sont régies par le droit [pays — à compléter].</p>
      </LegalSection>
    </LegalPageShell>
  );
}
