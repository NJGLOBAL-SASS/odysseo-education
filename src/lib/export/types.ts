export type ExportColumn<T> = {
  key: string;
  header: string;
  get: (row: T) => string;
};

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportResource = "candidatures" | "partenaires" | "newsletter";
