import { PrismaClient, StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@odysseo-education.com";
  const passwordHash = await bcrypt.hash("ChangeMoi123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrateur Odysseo",
      role: StaffRole.ADMIN,
      passwordHash,
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  const partner = await prisma.partner.upsert({
    where: { email: "partenaire.demo@odysseo-education.com" },
    update: {},
    create: {
      fullName: "Partenaire Démo",
      email: "partenaire.demo@odysseo-education.com",
      referralCode: "DEMO-001",
    },
  });

  console.log("Seed terminé :");
  console.log(`  Admin : ${admin.email} / mot de passe temporaire : ChangeMoi123!`);
  console.log(`  Partenaire démo : code ${partner.referralCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
