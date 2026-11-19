# -*- coding: utf-8 -*-
"""Implémentation de RÉFÉRENCE du moteur de recommandation pour les cycles langue, bachelor et mbbs (PACK-11).
Elle fait foi : le port TypeScript doit donner exactement les mêmes références que fixtures_mars.json.

Profil attendu :
  cycle_vise   : "langue" | "licence"
  age          : int
  familles     : liste de slugs de familles (vide = pas de préférence)
  hsk          : int ou None
  a_le_bac     : bool
  funding      : "bourse_uniquement" | "partiel" | "total"
"""
from datetime import date

VALEUR = {"or": 3, "argent": 2, "bronze": 1}
FAM_MED = "medecine-sante"


def _eligible(o, p, today):
    c = o.get("criteres", {})
    if not o.get("publiable"): return False
    if o.get("date_limite") and o["date_limite"] < today.isoformat(): return False
    if p["age"] < c.get("age_min", 0) or p["age"] > c.get("age_max", 99): return False
    if c.get("hsk_min") and (p.get("hsk") or 0) < c["hsk_min"]: return False
    if c.get("reserve_asie"): return False
    return True


def _total(o, pert, p):
    t = pert * 10 + VALEUR[o["score"]] * 3 + o["allocation_min_rmb_mois"] / 1000 - o["cout_annuel_rmb"] / 10000
    if p.get("funding") == "bourse_uniquement" and o["cout_annuel_rmb"] == 0:
        t += 2
    return round(t, 4)


def recommander(p, offres, today=date(2026, 11, 14)):
    if p["cycle_vise"] == "langue":
        pool = [o for o in offres if o["cycle"] == "langue"]
    else:
        cycles = {"bachelor"} | ({"mbbs"} if FAM_MED in p["familles"] else set())
        pool = [o for o in offres if o["cycle"] in cycles]
    pool = [o for o in pool if _eligible(o, p, today)]

    scored = []
    for o in pool:
        if o["cycle"] == "langue" or not p["familles"]:
            pert = 1
        else:
            pert = 1 if set(o["familles"]) & set(p["familles"]) else 0
        scored.append((o, pert, _total(o, pert, p)))
    # Licence : si au moins une offre correspond aux domaines, on ne garde que celles-là
    if p["cycle_vise"] == "licence" and any(s[1] for s in scored):
        scored = [s for s in scored if s[1]]
    scored.sort(key=lambda s: (-s[2], s[0]["ref"]))

    choix = []
    if scored:
        choix.append((scored[0][0], "ambitieuse"))
        reste = [s for s in scored[1:] if s[0]["ville"] != scored[0][0]["ville"]] or scored[1:]
        if reste:
            choix.append((reste[0][0], "cible"))
            villes = {c[0]["ville"] for c in choix}
            pris = {c[0]["ref"] for c in choix}
            r2 = [s for s in scored if s[0]["ref"] not in pris and s[0]["ville"] not in villes] \
                or [s for s in scored if s[0]["ref"] not in pris]
            if r2:
                # sécurité = la moins chère des restantes (puis meilleur total, puis référence)
                r2.sort(key=lambda s: (s[0]["cout_annuel_rmb"], -s[2], s[0]["ref"]))
                choix.append((r2[0][0], "securite"))

    res = dict(recommandations=[dict(ref=o["ref"], role=r) for o, r in choix], proposer_bachelor=None, repli_langue=False)
    # 4e offre facultative (« alternative ») : la meilleure restante, quelle que soit la ville
    if p["cycle_vise"] == "licence" and len(choix) == 3:
        pris = {c[0]["ref"] for c in choix}
        reste4 = [s for s in scored if s[0]["ref"] not in pris]
        if reste4:
            res["recommandations"].append(dict(ref=reste4[0][0]["ref"], role="alternative"))
    # Licence sans aucune offre possible (âge, HSK…) : on propose la langue, et le conseiller reprend la main
    if p["cycle_vise"] == "licence" and not choix:
        r = recommander(dict(p, cycle_vise="langue", a_le_bac=False), offres, today)
        res["recommandations"], res["repli_langue"] = r["recommandations"], bool(r["recommandations"])
    # Règle anti-« malin » : un profil Langue éligible à une licence se voit proposer le Bachelor
    if p["cycle_vise"] == "langue" and p.get("a_le_bac"):
        r_lic = recommander(dict(p, cycle_vise="licence"), offres, today)
        alt = [] if r_lic["repli_langue"] else r_lic["recommandations"]
        if alt:
            res["proposer_bachelor"] = alt[0]["ref"]
            res["recommandations"].append(dict(ref=alt[0]["ref"], role="alternative"))
    return res


if __name__ == "__main__":
    import json
    offres = json.load(open(__import__("os").path.join(__import__("os").path.dirname(__file__), "data/offres_mars_2027.json")))["offres"]
    profils = [
        dict(id="langue_20ans_bac", cycle_vise="langue", age=20, familles=[], hsk=None, a_le_bac=True, funding="partiel"),
        dict(id="langue_33ans", cycle_vise="langue", age=33, familles=[], hsk=None, a_le_bac=True, funding="total"),
        dict(id="licence_info_19ans", cycle_vise="licence", age=19, familles=["informatique-ia-electronique-telecoms"], hsk=None, a_le_bac=True, funding="bourse_uniquement"),
        dict(id="licence_gestion_27ans", cycle_vise="licence", age=27, familles=["economie-gestion-finance-commerce"], hsk=None, a_le_bac=True, funding="partiel"),
        dict(id="licence_medecine_20ans", cycle_vise="licence", age=20, familles=["medecine-sante"], hsk=None, a_le_bac=True, funding="total"),
        dict(id="licence_petrole_24ans_hsk3", cycle_vise="licence", age=24, familles=["petrole-geologie-mines-securite"], hsk=3, a_le_bac=True, funding="bourse_uniquement"),
        dict(id="licence_31ans_trop_age", cycle_vise="licence", age=31, familles=["informatique-ia-electronique-telecoms"], hsk=None, a_le_bac=True, funding="partiel"),
    ]
    fx = []
    for p in profils:
        r = recommander(p, offres)
        fx.append(dict(profil=p, attendu_refs=[x["ref"] for x in r["recommandations"]],
                       attendu_roles=[x["role"] for x in r["recommandations"]], attendu_proposer_bachelor=r["proposer_bachelor"], attendu_repli_langue=r["repli_langue"]))
        print(p["id"], r)
    json.dump(dict(date_reference="2026-11-14", fixtures=fx), open("fixtures_mars.json", "w"), ensure_ascii=False, indent=1)
