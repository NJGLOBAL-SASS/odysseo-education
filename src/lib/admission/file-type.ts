/**
 * Type réel d'un fichier d'après ses premiers octets (signature), pas d'après son extension (PACK-10).
 * Un « .exe renommé en .pdf » commence par « MZ » : refusé.
 */
export type SniffedType = "pdf" | "jpg" | "png" | "heic" | "webp" | "mp4" | "mov" | "doc" | "docx" | null;

export function sniffFileType(bytes: Uint8Array): SniffedType {
  const at = (i: number, ...sig: number[]) => sig.every((b, j) => bytes[i + j] === b);
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (at(0, 0x25, 0x50, 0x44, 0x46)) return "pdf"; // %PDF
  if (at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (/^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(brand)) return "heic";
    if (brand === "qt  ") return "mov";
    return "mp4"; // isom, mp41, mp42, M4V…
  }
  if (at(0, 0xd0, 0xcf, 0x11, 0xe0)) return "doc"; // OLE (Word 97-2003)
  if (at(0, 0x50, 0x4b, 0x03, 0x04)) return "docx"; // ZIP (Office récent)
  return null;
}

/** Extensions acceptées par un document → types réels acceptés. */
export function acceptedTypes(formats: string[]): Set<Exclude<SniffedType, null>> {
  const map: Record<string, Exclude<SniffedType, null>[]> = {
    pdf: ["pdf"],
    jpg: ["jpg"],
    jpeg: ["jpg"],
    png: ["png"],
    heic: ["heic"],
    webp: ["webp"],
    mp4: ["mp4", "mov"],
    mov: ["mov", "mp4"],
    doc: ["doc"],
    docx: ["docx"],
  };
  return new Set(formats.flatMap((f) => map[f.toLowerCase()] ?? []));
}

/** Types MIME annoncés au stockage pour une liste d'extensions. */
export function contentTypesFor(formats: string[]) {
  const map: Record<string, string[]> = {
    pdf: ["application/pdf"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    png: ["image/png"],
    heic: ["image/heic", "image/heif"],
    webp: ["image/webp"],
    mp4: ["video/mp4"],
    mov: ["video/quicktime"],
    doc: ["application/msword"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  };
  return [...new Set(formats.flatMap((f) => map[f.toLowerCase()] ?? []))];
}
