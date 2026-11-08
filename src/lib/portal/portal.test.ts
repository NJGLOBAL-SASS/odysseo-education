import { test } from "node:test";
import assert from "node:assert/strict";

import { isPortalHost, portalUrl } from "./host";
import { isAcceptablePassword } from "./password";
import { canPortalSeeFolder, portalFolderWhere, toPortalFolder } from "./documents";
import { isTeamHost } from "../hosts";

test("sous-domaine de l'espace étudiant, distinct de l'équipe et du site public", () => {
  assert.equal(isPortalHost("odysseo-application.vercel.app"), true);
  assert.equal(isPortalHost("application.localhost:3123"), true);
  assert.equal(isPortalHost("odysseo-education.vercel.app"), false);
  assert.equal(isPortalHost("team.odysseo-education.com"), false);
  assert.equal(isTeamHost("odysseo-application.vercel.app"), false);
  assert.equal(portalUrl("/fr/espace"), "https://odysseo-application.vercel.app/fr/espace");
});

test("mot de passe : 8 caractères minimum, pas seulement des chiffres", () => {
  assert.equal(isAcceptablePassword("abc12345"), true);
  assert.equal(isAcceptablePassword("1234567"), false);
  assert.equal(isAcceptablePassword("12345678"), false, "uniquement des chiffres");
  assert.equal(isAcceptablePassword("motdepasse"), true);
});

const base = { candidateId: "c1", visibleToCandidate: false, uploadedByPortalId: null as string | null };

test("documents : l'étudiant voit ses envois et ce que l'équipe a approuvé, rien d'autre", () => {
  assert.equal(canPortalSeeFolder(base, "c1"), false, "document de l'équipe non approuvé : privé");
  assert.equal(canPortalSeeFolder({ ...base, visibleToCandidate: true }, "c1"), true, "approuvé par l'équipe");
  assert.equal(canPortalSeeFolder({ ...base, uploadedByPortalId: "acc1" }, "c1"), true, "envoyé depuis l'espace");
  assert.equal(canPortalSeeFolder({ ...base, visibleToCandidate: true }, "c2"), false, "jamais le dossier d'un autre");
  assert.deepEqual(portalFolderWhere("c1"), { candidateId: "c1", OR: [{ visibleToCandidate: true }, { uploadedByPortalId: { not: null } }] });
});

test("documents : aucune URL de stockage ni membre de l'équipe renvoyés au navigateur", () => {
  const now = new Date();
  const folder = {
    id: "f1", kind: "passport", title: "Passeport", description: null, candidateId: "c1", createdById: "u1", visibleToCandidate: true,
    approvedById: "u1", approvedAt: now, uploadedByPortalId: null, createdAt: now, updatedAt: now, uploadedByPortal: null,
    files: [{ id: "x", folderId: "f1", name: "p.pdf", size: 10, contentType: "application/pdf", blobUrl: "https://secret.blob/x", uploadedById: "u1", uploadedByPortalId: null, createdAt: now }],
  };
  const out = toPortalFolder(folder, "acc1");
  const json = JSON.stringify(out);
  assert.ok(!json.includes("blob"), json);
  assert.ok(!json.includes("u1"), json);
  assert.equal(out.source, "team");
  assert.equal(out.files[0].mine, false);
});
