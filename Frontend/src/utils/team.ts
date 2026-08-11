import { apiFetch } from "./api";
import type { RoleName } from "./roles";

export interface TeamMember {
  id: number;
  email: string;
  name: string | null;
  roleName: RoleName;
  createdAt: string;
  isCurrentUser: boolean;
}

const API_TEAM = "/api/team";

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as { message?: unknown; detail?: unknown; title?: unknown };
      if (obj.message) return String(obj.message);
      if (obj.detail) return String(obj.detail);
      if (obj.title) return String(obj.title);
    }
  } catch {
    // not JSON — fall through to raw text
  }
  return text || fallback;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const response = await apiFetch(API_TEAM);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Team konnte nicht geladen werden (${response.status}).`));
  }
  return (await response.json()) as TeamMember[];
}

/** Invites a colleague into the current user's company (backend sets CompanyId from the inviter). */
export async function inviteTeamMember(email: string, roleName: RoleName): Promise<TeamMember> {
  const response = await apiFetch(`${API_TEAM}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, roleName }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Einladung fehlgeschlagen (${response.status}).`));
  }

  return (await response.json()) as TeamMember;
}

export async function updateTeamMemberRole(userId: number, roleName: RoleName): Promise<TeamMember> {
  const response = await apiFetch(`${API_TEAM}/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleName }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Rolle konnte nicht geändert werden."));
  }

  return (await response.json()) as TeamMember;
}

export async function removeTeamMember(userId: number): Promise<void> {
  const response = await apiFetch(`${API_TEAM}/${userId}`, { method: "DELETE" });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Mitglied konnte nicht entfernt werden."));
  }
}

export function formatJoinedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
