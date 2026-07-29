export type RiskBand = "red" | "yellow" | "green";

export const BAND_LABELS: Record<RiskBand, string> = {
  red: "Hohe Retourenquote (Rot)",
  yellow: "Mittlere Retourenquote (Gelb)",
  green: "Niedrige Retourenquote (Grün)",
};

export function parseBand(value: string | null | undefined): RiskBand | null {
  if (value === "red" || value === "yellow" || value === "green") return value;
  return null;
}

/** Dashboard Ampel tiles navigate here so the Retouren page can apply the server-side band filter. */
export function buildRetourenAnalysePath(band: RiskBand): string {
  return `/retouren-analyse?band=${band}`;
}

export function buildReturnsApiUrl(band: RiskBand | null): string {
  return band
    ? `/api/articles/returns?band=${encodeURIComponent(band)}`
    : "/api/articles/returns";
}
