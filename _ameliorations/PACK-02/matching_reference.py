# -*- coding: utf-8 -*-
"""Implémentation de RÉFÉRENCE de l'algorithme de correspondance Odysseo (PACK-02).
À porter en TypeScript côté serveur. Les résultats attendus sont dans fixtures_profils.json.
Usage : python3 matching_reference.py offres_2027.json fixtures_profils.json"""
import json, sys, unicodedata, re

DOMAINE_VERS_FAMILLES = {  # valeurs du champ « Domaine d'études souhaité » du formulaire actuel
 "medecine": ["medecine-sante", "pharmacie"],
 "ingenierie": ["genie-mecanique-electrique-energie-automatique", "aeronautique-genie-civil-architecture-transports",
                "materiaux-chimie-nanotechnologies", "petrole-geologie-mines-securite"],
 "informatique": ["informatique-ia-electronique-telecoms"],
 "commerce": ["economie-gestion-finance-commerce"],
 "relations-droit": ["droit-administration-sciences-sociales"],
 "langue-chinoise": ["education-langues-lettres-communication"],
 "sciences": ["biologie-biotechnologies", "mathematiques-physique", "materiaux-chimie-nanotechnologies", "environnement-ecologie-meteo"],
 "agriculture-environnement": ["agronomie-veterinaire-agroalimentaire", "environnement-ecologie-meteo"],
 "architecture-design": ["aeronautique-genie-civil-architecture-transports"],
 "education-sport": ["education-langues-lettres-communication", "sport"],
 "ne-sait-pas": [], "autre": [],
}
SCORE_VAL = {"or": 3, "argent": 2, "bronze": 1}

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]+", " ", s).split()

STOP = {"and", "of", "the", "et", "de", "en", "la", "le", "des", "du", "science", "sciences", "engineering", "technology", "studies"}

def filiere_match(filiere_libre, nom):
    t = [w for w in norm(filiere_libre) if w not in STOP and len(w) > 2]
    if not t: return False
    n = set(norm(nom))
    return all(any(w2.startswith(w[:6]) for w2 in n) for w in t)

def exclusions(o, p):
    c = o["criteres"]; why = []
    age = p.get("age")
    if age is not None:
        if "age_max" in c and age > c["age_max"]: why.append("age")
        if "age_min" in c and age < c["age_min"]: why.append("age")
    m = p.get("moyenne_pct")
    if m is not None and "moyenne_min_pct" in c and m < c["moyenne_min_pct"]: why.append("moyenne")
    if p.get("nationalite") in c.get("nationalites_exclues", []): why.append("nationalite")
    if c.get("diplomes_originaux") and p.get("diplomes_originaux") is False: why.append("diplomes_originaux")
    if c.get("eligibilite_omm_requise") and not p.get("eligible_omm"): why.append("omm")
    hsk = p.get("hsk", 0)
    if "hsk_min" in c and hsk < c["hsk_min"]: why.append("hsk")
    rb = p.get("releve_bancaire_usd_max")
    if rb is not None and "releve_bancaire_usd" in c and rb < c["releve_bancaire_usd"]: why.append("releve_bancaire")
    a = p.get("anglais", {"type": "aucun"}); t = a.get("type")
    key = {"ielts": "ielts_min", "toefl": "toefl_min", "duolingo": "duolingo_min"}.get(t)
    if key and key in c and a.get("score", 0) < c[key]: why.append("anglais")
    if t in ("aucun", "etudes_en_anglais") and "ielts_min" in c and c.get("certificat_anglais_obligatoire", True): why.append("certificat_anglais")
    return why

def recommander(offres, p, n=3):
    fams = set()
    for d in p.get("domaines", []): fams |= set(DOMAINE_VERS_FAMILLES.get(d, []))
    lib = (p.get("filiere_libre") or "").strip()
    hsk = p.get("hsk", 0)
    cands = []
    for o in offres:
        if o["cycle"] != p["cycle"] or not o["publiable"]: continue
        if exclusions(o, p): continue
        majors = [m for m in o["filieres"] if m["langue"] == "anglais" or hsk >= 4]
        exact = [m["nom"] for m in majors if lib and filiere_match(lib, m["nom"])]
        fam = [m["nom"] for m in majors if m["famille"] in fams]
        if exact: pert, corresp = 3, exact
        elif fam: pert, corresp = 2, fam
        elif not fams and not lib: pert, corresp = 1, [m["nom"] for m in majors]
        else: continue
        val = SCORE_VAL[o["score"]] + (0.5 if o["potentiel_or"] else 0)
        if p.get("financement") == "bourse_uniquement" and not o["scolarite_offerte_garantie"]: val -= 1
        total = round(pert * 10 + val * 3 + o["allocation_min_rmb_mois"] / 1000, 3)
        cands.append(dict(o=o, total=total, corresp=corresp))
    cands.sort(key=lambda x: (-x["total"], x["o"]["ref"]))
    choix = []
    if cands: choix.append(("ambitieuse", cands[0]))
    reste = [c for c in cands if c not in [x[1] for x in choix]]
    villes = lambda: {x[1]["o"]["ville"] for x in choix}
    cible = next((c for c in reste if c["o"]["ville"] not in villes() and c["o"]["score"] in ("or", "argent")), None) \
        or next((c for c in reste if c["o"]["ville"] not in villes()), None) or (reste[0] if reste else None)
    if cible: choix.append(("cible", cible))
    reste = [c for c in cands if c not in [x[1] for x in choix]]
    secu = next((c for c in reste if c["o"]["ville"] not in villes() and not c["o"]["criteres"]), None) \
        or next((c for c in reste if c["o"]["ville"] not in villes()), None) or (reste[0] if reste else None)
    if secu: choix.append(("securite", secu))
    return [dict(ref=c["o"]["ref"], role=r, ville=c["o"]["ville"], total=c["total"], filieres_correspondantes=c["corresp"][:3]) for r, c in choix[:n]]

if __name__ == "__main__":
    offres = json.load(open(sys.argv[1]))["offres"]
    fx = json.load(open(sys.argv[2]))
    ok = True
    for f in fx["profils"]:
        res = recommander(offres, f["profil"])
        got = [r["ref"] for r in res]
        good = got == f["attendu_refs"]
        ok &= good
        print(("OK  " if good else "FAIL"), f["id"], got, "" if good else f"attendu {f['attendu_refs']}")
    sys.exit(0 if ok else 1)
