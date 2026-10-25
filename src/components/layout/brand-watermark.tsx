/**
 * Filigrane Odysseo en arrière-plan : motif du logo (Od + orbite) en
 * mosaïque inclinée, très discret, plus un grand logo fondu en bas de page.
 * Purement décoratif — placé derrière le contenu dans un parent `relative`.
 */
export function BrandWatermark() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -inset-[30%] rotate-[-14deg] opacity-[0.045] "
        style={{
          backgroundImage: "url(/images/logo/logo-mark-black-pattern.png)",
          backgroundSize: "150px 150px",
          backgroundRepeat: "repeat",
        }}
      />
      {/* Fondu : le motif s'efface derrière la carte du formulaire pour ne pas gêner la lecture. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_42%,#F4F4F6_35%,rgba(244,244,246,0.55)_70%,transparent_100%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo/logo-mark-black-pattern.png"
        alt=""
        className="absolute -bottom-[12%] -right-[10%] w-[min(70vw,640px)] opacity-[0.05]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo/logo-mark-black-pattern.png"
        alt=""
        className="absolute -left-[14%] top-[8%] hidden w-[420px] rotate-[18deg] opacity-[0.035] lg:block"
      />
    </div>
  );
}
