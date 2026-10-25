/* eslint-disable react/no-unescaped-entities -- contenu juridique en prose française/anglaise */
import { setRequestLocale } from "next-intl/server";

import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { Link } from "@/i18n/navigation";

const LAST_UPDATED = "24 octobre 2026";

export default function TermsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const isFr = params.locale !== "en";

  if (!isFr) {
    return (
      <LegalPageShell title="Terms of Use" updatedAt={`Last updated: ${LAST_UPDATED}`}>
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
            Education processing it to review your application and contact you on WhatsApp,
            as described in our <Link href="/confidentialite">Privacy Policy</Link>.
          </p>
        </LegalSection>

        <LegalSection title="4. Partner program">
          <p>
            Partners who share their referral link or code receive points when a referred
            candidate submits a complete application, is qualified, or is enrolled. Points
            have no cash value, are not transferable, and Odysseo Education may adjust the
            points schedule or suspend a partner account in case of abusive or fraudulent use
            (e.g. fake submissions).
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
    <LegalPageShell title="Conditions générales d'utilisation" updatedAt={`Dernière mise à jour : ${LAST_UPDATED}`}>
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
          Education les traite pour étudier votre dossier et vous contacter sur WhatsApp,
          comme décrit dans notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection title="4. Programme partenaires">
        <p>
          Les partenaires qui partagent leur lien ou code de parrainage reçoivent des points
          lorsqu'un candidat orienté soumet un dossier complet, est qualifié, ou est admis.
          Les points n'ont aucune valeur monétaire, ne sont pas transférables, et Odysseo
          Education peut ajuster le barème de points ou suspendre un compte partenaire en cas
          d'usage abusif ou frauduleux (ex. fausses soumissions).
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
