import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link2, Gift, TrendingUp } from "lucide-react";

import { PartnerApplicationForm } from "@/components/marketing/partner-application-form";
import { BrandWatermark } from "@/components/layout/brand-watermark";

export default async function PartnersPublicPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("partner");
  const isFr = params.locale === "fr";

  const steps = isFr
    ? [
        { icon: Link2, title: "Partagez votre lien", text: "Chaque partenaire reçoit un code et un lien uniques à partager." },
        { icon: TrendingUp, title: "Suivez vos filleuls", text: "Chaque dossier soumis avec votre lien est automatiquement attribué à votre compte." },
        { icon: Gift, title: "Gagnez des points", text: "Des points sont crédités à chaque étape clé : nouveau dossier, dossier qualifié, étudiant admis." },
      ]
    : [
        { icon: Link2, title: "Share your link", text: "Every partner receives a unique code and link to share." },
        { icon: TrendingUp, title: "Track your referrals", text: "Every application submitted with your link is automatically attributed to your account." },
        { icon: Gift, title: "Earn points", text: "Points are credited at each key stage: new lead, qualified lead, enrolled student." },
      ];

  return (
    <div className="relative isolate">
      <BrandWatermark />
      <div className="wrap-site relative py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            {isFr ? "Devenez partenaire Odysseo" : "Become an Odysseo partner"}
          </h1>
          <p className="mt-3 text-gris">
            {isFr
              ? "Un programme simple et transparent pour récompenser celles et ceux qui nous apportent des étudiants sérieux."
              : "A simple, transparent program to reward those who bring us serious students."}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="card p-5">
              <s.icon className="mb-3 h-6 w-6 text-rouge" />
              <h3 className="mb-1 font-extrabold">{s.title}</h3>
              <p className="text-sm text-gris">{s.text}</p>
            </div>
          ))}
        </div>

        <div id="demande" className="mx-auto mt-12 max-w-2xl scroll-mt-6">
          <PartnerApplicationForm />
        </div>
      </div>
    </div>
  );
}
