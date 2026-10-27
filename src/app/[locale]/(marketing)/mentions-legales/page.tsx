/* eslint-disable react/no-unescaped-entities -- contenu juridique en prose française/anglaise */
import { setRequestLocale } from "next-intl/server";

import {
  LegalPageShell,
  LegalSection,
} from "@/components/legal/legal-page-shell";

const LAST_UPDATED = { fr: "27 octobre 2026", en: "October 27, 2026" };
const PLACEHOLDER_NOTICE_FR =
  "Les informations marquées [à compléter] doivent être renseignées par Odysseo Education avant la mise en ligne, conformément à la réglementation applicable dans son pays d'immatriculation.";
const PLACEHOLDER_NOTICE_EN =
  "Information marked [to complete] must be filled in by Odysseo Education before going live, in line with the regulations applicable in its country of registration.";

export default function LegalNoticePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const isFr = params.locale !== "en";

  if (!isFr) {
    return (
      <LegalPageShell
        title="Legal Notice"
        updatedAt={`Last updated: ${LAST_UPDATED.en}`}
      >
        <div className="mb-8 rounded-brand border-[1.5px] border-[#E8D26B] bg-[#FFF8D6] p-3.5 text-sm text-[#5B4A00]">
          {PLACEHOLDER_NOTICE_EN}
        </div>

        <LegalSection title="1. Website publisher">
          <ul>
            <li>Name: Odysseo Education</li>
            <li>Legal form: [to complete]</li>
            <li>Registered address: [to complete]</li>
            <li>Business registration number: [to complete]</li>
            <li>Publication director: [to complete]</li>
            <li>
              Contact:{" "}
              <a href="mailto:contact.odysseo@gmail.com">
                contact.odysseo@gmail.com
              </a>
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="2. Hosting">
          <ul>
            <li>
              Website and dashboard: <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
              Covina, CA 91723, United States — vercel.com
            </li>
            <li>
              Database: <strong>Neon</strong> (Databricks, Inc.), cloud hosting in the United
              States — neon.tech
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Intellectual property">
          <p>
            The Odysseo Education name, logo and visual identity, as well as the
            content published on this site, are the property of Odysseo
            Education and may not be reproduced without prior written consent.
          </p>
        </LegalSection>

        <LegalSection title="4. Hyperlinks">
          <p>
            This site may contain links to third-party sites (e.g. WhatsApp,
            university websites). Odysseo Education is not responsible for the
            content or practices of these third-party sites.
          </p>
        </LegalSection>

        <LegalSection title="5. Liability">
          <p>
            Odysseo Education makes every effort to ensure the accuracy of the
            information published on this site but cannot guarantee it is
            complete, accurate or up to date at all times.
          </p>
        </LegalSection>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell
      title="Mentions légales"
      updatedAt={`Dernière mise à jour : ${LAST_UPDATED.fr}`}
    >
      <div className="mb-8 rounded-brand border-[1.5px] border-[#E8D26B] bg-[#FFF8D6] p-3.5 text-sm text-[#5B4A00]">
        {PLACEHOLDER_NOTICE_FR}
      </div>

      <LegalSection title="1. Éditeur du site">
        <ul>
          <li>Nom : Odysseo Education</li>
          <li>Forme juridique : [à compléter]</li>
          <li>Siège social : [à compléter]</li>
          <li>Numéro d'immatriculation (RCCM ou équivalent) : [à compléter]</li>
          <li>Directeur de la publication : [à compléter]</li>
          <li>
            Contact :{" "}
            <a href="mailto:contact.odysseo@gmail.com">
              contact.odysseo@gmail.com
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Hébergement">
        <ul>
          <li>
            Site et tableau de bord : <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
            Covina, CA 91723, États-Unis — vercel.com
          </li>
          <li>
            Base de données : <strong>Neon</strong> (Databricks, Inc.), hébergement cloud aux
            États-Unis — neon.tech
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Propriété intellectuelle">
        <p>
          Le nom, le logo et l'identité visuelle Odysseo Education, ainsi que
          les contenus publiés sur ce site, sont la propriété d'Odysseo
          Education et ne peuvent être reproduits sans accord écrit préalable.
        </p>
      </LegalSection>

      <LegalSection title="4. Liens hypertextes">
        <p>
          Ce site peut contenir des liens vers des sites tiers (WhatsApp, sites
          d'universités, etc.). Odysseo Education n'est pas responsable du
          contenu ni des pratiques de ces sites tiers.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilité">
        <p>
          Odysseo Education s'efforce d'assurer l'exactitude des informations
          publiées sur ce site, sans pouvoir garantir qu'elles soient complètes,
          exactes ou à jour à tout moment.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
