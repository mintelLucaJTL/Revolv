import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, Button, Text } from "@jtl-software/platform-ui-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_ADMIN, ROLE_MITARBEITER, type RoleName } from "../utils/roles";
import {
  fetchTeamMembers,
  formatJoinedDate,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  type TeamMember,
} from "../utils/team";
import Skeleton from "../components/Skeleton";

function TeamMembersSkeleton() {
  return (
    <div className="mt-4" aria-busy="true">
      <span className="sr-only">Team wird geladen</span>
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-10 min-w-[220px] flex-1" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Box className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-3 py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </Box>
    </div>
  );
}

/**
 * Admin-only team management: list colleagues, invite by email (backend assigns the
 * inviter's CompanyId), and change roles. Invitees set their password via the
 * existing reset-password link from the invite email.
 */
export default function Team() {
  const navigate = useNavigate();
  const { refreshSession, logout } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>(ROLE_MITARBEITER);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [savingRoleForId, setSavingRoleForId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeamMembers();
      setMembers(data);
      setError(null);
    } catch (err) {
      console.error("Fetch team error:", err);
      setError(
        err instanceof TypeError
          ? "Backend nicht erreichbar. Starte RevolvAPI (http://localhost:5215)."
          : err instanceof Error
            ? err.message
            : "Das Team konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, []);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    setInviteError(null);
    setActionMessage(null);
    setActionError(false);

    try {
      const created = await inviteTeamMember(email, inviteRole);
      setMembers((prev) => [...prev, created]);
      setInviteEmail("");
      setActionMessage(`Einladung an ${created.email} gesendet.`);
      setActionError(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Einladung fehlgeschlagen.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, nextRole: RoleName) => {
    if (nextRole === member.roleName) return;

    setSavingRoleForId(member.id);
    setActionMessage(null);
    setActionError(false);

    try {
      const updated = await updateTeamMemberRole(member.id, nextRole);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

      // Refresh JWT so Admin-only nav/routes (Settings, Mein Team) update immediately.
      if (member.isCurrentUser) {
        const refreshed = await refreshSession();

        if (nextRole !== ROLE_ADMIN) {
          // If refresh failed, the old Admin JWT may still authorize admin APIs — log out.
          if (!refreshed) {
            await logout();
            navigate("/login", { replace: true });
            return;
          }
          navigate("/dashboard", { replace: true });
          return;
        }
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Rolle konnte nicht geändert werden.");
      setActionError(true);
    } finally {
      setSavingRoleForId(null);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!window.confirm(`${member.name ?? member.email} wirklich aus dem Team entfernen?`)) {
      return;
    }

    setRemovingId(member.id);
    setActionMessage(null);
    setActionError(false);

    try {
      await removeTeamMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setActionMessage(`${member.name ?? member.email} wurde entfernt.`);
      setActionError(false);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Mitglied konnte nicht entfernt werden.");
      setActionError(true);
    } finally {
      setRemovingId(null);
    }
  };

  const inputClass =
    "w-full rounded border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <>
      <Text weight="bold">Mein Team</Text>
          <Box className="mt-1">
            <Text type="xs">
              Mitarbeiter einladen und Rollen verwalten. Eingeladene Nutzer gehören automatisch zu
              deinem Unternehmen.
            </Text>
          </Box>

          <Card className="mt-6 border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <Text weight="bold">Mitglieder</Text>
            <Box className="mt-1">
              {loading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <Text type="xs">
                  {`${members.length} Mitglied${members.length === 1 ? "" : "er"}`}
                </Text>
              )}
            </Box>

            {loading ? (
              <TeamMembersSkeleton />
            ) : error ? (
              <Box className="mt-4 flex flex-col items-start gap-3">
                <Text type="xs" color="danger">
                  {error}
                </Text>
                <Button label="Erneut versuchen" onClick={() => void loadTeam()} />
              </Box>
            ) : (
              <>
                <form onSubmit={handleInvite} className="mt-4 flex flex-wrap items-end gap-3">
                  <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                    <span className="text-xs">E-Mail-Adresse</span>
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
                    <span className="text-xs">Rolle</span>
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
                    type="submit"
                    label={inviting ? "Sendet…" : "Einladen"}
                    variant="highlight"
                    disabled={inviting}
                    isLoading={inviting}
                  />
                </form>

                {inviteError && (
                  <Box className="mt-2">
                    <Text type="xs" color="danger">
                      {inviteError}
                    </Text>
                  </Box>
                )}

                {actionMessage && (
                  <Box className="mt-2">
                    <Text type="xs" color={actionError ? "danger" : undefined}>
                      {actionMessage}
                    </Text>
                  </Box>
                )}

                <Box className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
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
                        <Text type="xs">
                          {member.email} · seit {formatJoinedDate(member.createdAt)}
                        </Text>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <select
                          value={member.roleName}
                          disabled={savingRoleForId === member.id}
                          onChange={(e) => handleRoleChange(member, e.target.value as RoleName)}
                          className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="Mitarbeiter">Mitarbeiter</option>
                          <option value="Admin">Admin</option>
                        </select>

                        {!member.isCurrentUser && (
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
                </Box>
              </>
            )}
          </Card>
    </>
  );
}
