// Shared across ReturnReasonsChart and LatestReturnsList so the same reason text always gets
// the same color everywhere on the dashboard, even though each component fetches from a
// different endpoint with its own ordering (previously: color-by-array-index per component,
// which meant the same reason could show up blue in one card and orange in the other).
const REASON_COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#64748B"];

// DJB2 - simple sum-based hashing collided on our actual reason strings (two different
// reasons landed on the same color); DJB2's bit-shift mixing spreads short strings better.
export function getReasonColor(reason: string): string {
  let hash = 5381;
  for (let i = 0; i < reason.length; i++) {
    hash = ((hash << 5) + hash + reason.charCodeAt(i)) | 0;
  }
  return REASON_COLORS[Math.abs(hash) % REASON_COLORS.length];
}
