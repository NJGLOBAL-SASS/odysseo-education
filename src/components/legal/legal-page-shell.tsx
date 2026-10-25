import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="wrap-site py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mb-10 mt-2 text-sm text-gris">{updatedAt}</p>
        {children}
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-lg font-extrabold text-texte">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gris [&_a]:font-semibold [&_a]:text-noir [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-texte">
        {children}
      </div>
    </section>
  );
}
