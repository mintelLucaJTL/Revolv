import { useEffect, useState } from "react";
import { Box, Card, CardContent, CardHeader, CardTitle, Button, Text } from "@jtl-software/platform-ui-react";
import TopNavigationBar from "../components/TopNavigationBar";
import Sidebar from "../components/Sidebar";
import { useToast } from "../components/Toast";
import { apiFetch } from "../utils/api";

type RoleName = "Admin" | "Mitarbeiter";

interface TeamMember {
  id: number;
  email: string;
  name: string | null;
  roleName: RoleName;
  createdAt: string;
  isCurrentUser: boolean;
}

const inputClass =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-900";

function formatJoinedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

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

export default function Team() {
  const { showToast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>("Mitarbeiter");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [savingRoleForId, setSavingRoleForId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadTeam = async () => {
    try {
      const response = await apiFetch("/api/team");
      if (!response.ok) {
        throw new Error(`Team konnte nicht geladen werden (${response.status}).`);
      }
      const data = (await response.json()) as TeamMember[];
      setMembers(data);
      setError(null);
    } catch (err) {
      console.error("Fetch team error:", err);
      setError(
        err instanceof TypeError
          ? "Backend nicht erreichbar. Starte RevolvAPI (http://localhost:5215)."
          : "Das Team konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, []);

  const currentMember = members.find((m) => m.isCurrentUser);
  const isAdmin = currentMember?.roleName === "Admin";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    setInviteError(null);

    try {
      const response = await apiFetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, roleName: inviteRole }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, `Einladung fehlgeschlagen (${response.status}).`));
      }

      const created = (await response.json()) as TeamMember;
      setMembers((prev) => [...prev, created]);
      setInviteEmail("");
      showToast({ type: "success", message: `Einladung an ${created.email} gesendet.` });
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Einladung fehlgeschlagen.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, nextRole: RoleName) => {
    if (nextRole === member.roleName) return;

    setSavingRoleForId(member.id);

    try {
      const response = await apiFetch(`/api/team/${member.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName: nextRole }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Rolle konnte nicht geändert werden."));
      }

      const updated = (await response.json()) as TeamMember;
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Rolle konnte nicht geändert werden.",
      });
    } finally {
      setSavingRoleForId(null);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!window.confirm(`${member.name ?? member.email} wirklich aus dem Team entfernen?`)) {
      return;
    }

    setRemovingId(member.id);

    try {
      const response = await apiFetch(`/api/team/${member.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Mitglied konnte nicht entfernt werden."));
      }

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      showToast({ type: "success", message: `${member.name ?? member.email} wurde entfernt.` });
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Mitglied konnte nicht entfernt werden.",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNavigationBar />

      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <div>
              <Text weight="bold">Team</Text>
              <Text type="xs" color="muted">
                {loading ? "Lädt…" : `${members.length} Mitglied${members.length === 1 ? "" : "er"}`}
              </Text>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            {isAdmin && (
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-slate-100">Teammitglied einladen</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
                    <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">E-Mail-Adresse</span>
                      <input
                        type="email"
                        required
                        placeholder="kolleg:in@firma.de"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Rolle</span>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as RoleName)}
                        className={inputClass}
                      >
                        <option value="Mitarbeiter">Mitarbeiter</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </label>

                    <Button
                      label={inviting ? "Sendet…" : "Einladen"}
                      variant="highlight"
                      disabled={inviting}
                    />
                  </form>

                  {inviteError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{inviteError}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="dark:bg-slate-900 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Mitglieder</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Keine Teammitglieder gefunden.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Text weight="semibold">{member.name ?? member.email}</Text>
                            {member.isCurrentUser && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                Du
                              </span>
                            )}
                          </div>
                          <Text type="xs" color="muted">
                            {member.email} · seit {formatJoinedDate(member.createdAt)}
                          </Text>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {isAdmin ? (
                            <select
                              value={member.roleName}
                              disabled={savingRoleForId === member.id}
                              onChange={(e) => handleRoleChange(member, e.target.value as RoleName)}
                              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                            >
                              <option value="Mitarbeiter">Mitarbeiter</option>
                              <option value="Admin">Admin</option>
                            </select>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {member.roleName}
                            </span>
                          )}

                          {isAdmin && !member.isCurrentUser && (
                            <Button
                              label={removingId === member.id ? "Entfernt…" : "Entfernen"}
                              variant="ghost"
                              disabled={removingId === member.id}
                              onClick={() => handleRemove(member)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Box>
      </Box>
    </Box>
  );
}
