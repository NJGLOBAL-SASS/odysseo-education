export type ExportColumn<T> = {
  key: string;
  header: string;
  get: (row: T) => string;
  /**
   * Largeur relative de la colonne dans le PDF (1 par défaut). 0 = colonne
   * absente du PDF (format paysage limité) mais conservée en CSV / Excel.
   */
  pdfWeight?: number;
};

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportResource = "candidatures" | "partenaires" | "newsletter";
