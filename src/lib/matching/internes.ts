/**
 * Correspondance référence → vraie université et partenaire. CONFIDENTIEL (PACK-02).
 * Lu uniquement par le tableau de bord de l'équipe (composant serveur protégé).
 * Ne jamais importer dans un composant client ni renvoyer par une API publique.
 */
import "server-only";

import internesJson from "../../../data/offres/offres_2027_internes.json";

export interface InternalOffer {
  ref: string;
  universite: string;
  partenaire: string;
  classement_selon_partenaire: string | null;
  note_interne: string | null;
}

const byRef = new Map<string, InternalOffer>(
  (internesJson as unknown as { offres: InternalOffer[] }).offres.map((o) => [o.ref, o]),
);

export function getInternalOffer(ref: string): InternalOffer | undefined {
  return byRef.get(ref);
}
