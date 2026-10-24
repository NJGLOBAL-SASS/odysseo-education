"use client";

import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { newsletterColumns } from "@/lib/export/columns";
import type { NewsletterSubscriber } from "@prisma/client";

export function NewsletterPanel({ locale }: { locale: string }) {
  const { data: subscribers, isOffline, cachedAt } = useOfflineDataset<NewsletterSubscriber>(
    "newsletter",
    "/api/newsletter",
    "subscribers"
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Newsletter</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gris">{subscribers.length} abonnés</span>
          <ExportButtons
            resource="newsletter"
            isOffline={isOffline}
            offlineRows={subscribers}
            offlineColumns={newsletterColumns}
          />
        </div>
      </div>

      {isOffline && <OfflineBanner cachedAt={cachedAt} />}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bord text-gris">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Langue</th>
              <th className="px-4 py-3 font-semibold">Inscrit le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bord">
            {subscribers.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3 uppercase">{s.locale}</td>
                <td className="px-4 py-3 text-gris">
                  {new Intl.DateTimeFormat(locale).format(new Date(s.createdAt))}
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gris">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
