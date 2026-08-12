// Shared across ReturnReasonsChart and LatestReturnsList so the same reason text always gets
// the same color everywhere on the dashboard, even though each component fetches from a
// different endpoint with its own ordering (previously: color-by-array-index per component,
// which meant the same reason could show up blue in one card and orange in the other).
//
// JTL-Blau-Palette: reine Blau-/Indigo-/Cyan-Töne statt bunt gemischter Farben - Rot/Gelb/Grün
// bleiben allein der Retouren-Ampel vorbehalten (siehe KpiCard-Varianten), damit deren
// Signalfarben nicht durch dieselben Farben anderswo auf dem Dashboard verwässert werden.
const REASON_COLORS = ["#1D4ED8", "#0EA5E9", "#6366F1", "#0891B2", "#93C5FD", "#1E3A8A"];

// DJB2 - simple sum-based hashing collided on our actual reason strings (two different
// reasons landed on the same color); DJB2's bit-shift mixing spreads short strings better.
export function getReasonColor(reason: string): string {
  let hash = 5381;
  for (let i = 0; i < reason.length; i++) {
    hash = ((hash << 5) + hash + reason.charCodeAt(i)) | 0;
  }
  return REASON_COLORS[Math.abs(hash) % REASON_COLORS.length];
}
