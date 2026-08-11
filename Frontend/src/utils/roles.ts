// Role helpers aligned with RevolvAPI.Models.RoleNames (JWT ClaimTypes.Role).

export type RoleName = "Admin" | "Mitarbeiter";

export const ROLE_ADMIN: RoleName = "Admin";
export const ROLE_MITARBEITER: RoleName = "Mitarbeiter";

const ROLE_CLAIM_KEYS = [
  "role",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
] as const;

function normalizeRole(value: unknown): RoleName | null {
  if (typeof value === "string") {
    if (value === ROLE_ADMIN || value === ROLE_MITARBEITER) return value;
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const role = normalizeRole(entry);
      if (role) return role;
    }
  }

  return null;
}

/**
 * Reads the role claim from a JWT access token without verifying the signature.
 * Used only for UI gating; the API still enforces authorization.
 */
export function decodeRoleFromAccessToken(token: string | null | undefined): RoleName | null {
  if (!token) return null;

  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;

    const json = atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as Record<string, unknown>;

    for (const key of ROLE_CLAIM_KEYS) {
      const role = normalizeRole(payload[key]);
      if (role) return role;
    }
  } catch {
    return null;
  }

  return null;
}

export function isAdminRole(role: RoleName | null | undefined): boolean {
  return role === ROLE_ADMIN;
}
