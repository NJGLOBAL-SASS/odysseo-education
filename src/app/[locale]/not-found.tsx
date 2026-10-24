export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-fond px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo/logo-full-black.png" alt="Odysseo" className="mb-2 h-8 w-auto" />
      <h1 className="text-2xl font-extrabold">Page introuvable</h1>
      <p className="text-gris">Cette page n&apos;existe pas ou n&apos;est pas disponible sur ce domaine.</p>
      <a href="/" className="btn-primary mt-2 !w-auto">
        Retour à l&apos;accueil
      </a>
    </div>
  );
}
