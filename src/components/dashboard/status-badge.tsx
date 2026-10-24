const STYLES: Record<string, string> = {
  NOUVEAU: "bg-[#E8EAFE] text-[#3A4AD6]",
  QUALIFIE: "bg-[#FFF3D6] text-[#8A6200]",
  DOSSIER_EN_COURS: "bg-[#FFE9CC] text-[#A35400]",
  BOURSE_SOUMISE: "bg-[#E3F0FF] text-[#0B5FA5]",
  ADMIS: "bg-[#E1F6EA] text-[#0F7B3F]",
  VISA_EN_COURS: "bg-[#F1E6FF] text-[#6A2DBF]",
  CLOTURE: "bg-[#E8E8EC] text-[#3F3F46]",
  REFUSE: "bg-[#FFE4E4] text-[#B00000]",
};

export const STATUS_LABELS_FR: Record<string, string> = {
  NOUVEAU: "Nouveau",
  QUALIFIE: "Qualifié",
  DOSSIER_EN_COURS: "Dossier en cours",
  BOURSE_SOUMISE: "Bourse soumise",
  ADMIS: "Admis",
  VISA_EN_COURS: "Visa en cours",
  CLOTURE: "Clôturé",
  REFUSE: "Refusé",
};

export const STATUS_LABELS_EN: Record<string, string> = {
  NOUVEAU: "New",
  QUALIFIE: "Qualified",
  DOSSIER_EN_COURS: "File in progress",
  BOURSE_SOUMISE: "Scholarship submitted",
  ADMIS: "Enrolled",
  VISA_EN_COURS: "Visa in progress",
  CLOTURE: "Closed",
  REFUSE: "Rejected",
};

export function StatusBadge({ status, locale = "fr" }: { status: string; locale?: string }) {
  const labels = locale === "en" ? STATUS_LABELS_EN : STATUS_LABELS_FR;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status] ?? "bg-fond text-gris"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
