import { NotFoundView } from "@/components/errors/not-found-view";

/**
 * Dernier filet : URL hors du routage par langue (ex. /fichier.php, ignorée
 * par le middleware). Pas de contexte i18n ici, d'où le texte en dur.
 */
export default function RootNotFound() {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <NotFoundView
          eyebrow="Erreur 404"
          title="Cette page s'est perdue en chemin"
          text="La page que vous cherchez n'existe pas ou a été déplacée. · The page you are looking for doesn't exist."
          homeHref="/"
          footer={`© ${new Date().getFullYear()} Odysseo Education`}
          actions={
            <>
              <a href="/fr" className="btn-ghost transition-colors hover:bg-fond sm:!w-auto">
                Retour à l&apos;accueil
              </a>
              <a href="/fr/postuler" className="btn-primary sm:!w-auto">
                Déposer mon dossier
              </a>
            </>
          }
        />
      </body>
    </html>
  );
}
