import { useEffect, useRef, useState, type FormEvent } from "react";
import { Box, Card, Button, Text } from "@jtl-software/platform-ui-react";
import Sidebar from "../components/Sidebar";
import TopNavigationBar from "../components/TopNavigationBar";
import { apiFetch } from "../utils/api";

// DTO for the settings API.
interface SettingsApiDto {
  toneOfVoice: string;
  autoAnalyzeNewIssues: boolean;
  thresholdYellow: number;
  thresholdRed: number;
}

type ThemeMode = "light" | "dark";

type RoleName = "Admin" | "Mitarbeiter";

interface TeamMember {
  id: number;
  email: string;
  name: string | null;
  roleName: RoleName;
  createdAt: string;
  isCurrentUser: boolean;
}

// API endpoint for the settings.
const API_SETTINGS = "/api/settings";
const API_TEAM = "/api/team";

// Must match RevolvAPI ToneOfVoiceOptions.Allowed.
const ALLOWED_TONES = ["Locker", "Formell und sachlich"] as const;

const DEFAULT_TONE = "Formell und sachlich";

function normalizeTone(tone: string | undefined): string {
  return ALLOWED_TONES.includes(tone as (typeof ALLOWED_TONES)[number])
    ? (tone as string)
    : DEFAULT_TONE;
}

// Applies the settings to the form.
function applySettingsToForm(
  data: SettingsApiDto,
  setters: {
    setTone: (v: string) => void;
    setAutoAnalysis: (v: boolean) => void;
    setYellowThreshold: (v: number) => void;
    setRedThreshold: (v: number) => void;
  },
) {
  setters.setTone(normalizeTone(data.toneOfVoice));
  setters.setAutoAnalysis(Boolean(data.autoAnalyzeNewIssues));
  setters.setYellowThreshold(Number(data.thresholdYellow));
  setters.setRedThreshold(Number(data.thresholdRed));
}

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

export default function Settings() {
  const [tone, setTone] = useState("");
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [yellowThreshold, setYellowThreshold] = useState<number | "">("");
  const [redThreshold, setRedThreshold] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const savingRef = useRef(false);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>("Mitarbeiter");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [savingRoleForId, setSavingRoleForId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [teamActionMessage, setTeamActionMessage] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const saved = window.localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch(API_SETTINGS);
        if (!response.ok) {
          throw new Error("Einstellungen konnten nicht geladen werden.");
        }

        const data = (await response.json()) as SettingsApiDto;
        applySettingsToForm(data, {
          setTone,
          setAutoAnalysis,
          setYellowThreshold,
          setRedThreshold,
        });
      } catch (error) {
        console.error(error);
        setMessage("Die Einstellungen konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const loadTeam = async () => {
    try {
      const response = await apiFetch(API_TEAM);
      if (!response.ok) {
        throw new Error(`Team konnte nicht geladen werden (${response.status}).`);
      }
      const data = (await response.json()) as TeamMember[];
      setMembers(data);
      setTeamError(null);
    } catch (err) {
      console.error("Fetch team error:", err);
      setTeamError(
        err instanceof TypeError
          ? "Backend nicht erreichbar. Starte RevolvAPI (http://localhost:5215)."
          : "Das Team konnte nicht geladen werden.",
      );
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, []);

  const currentMember = members.find((m) => m.isCurrentUser);
  const isAdmin = currentMember?.roleName === "Admin";

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    setInviteError(null);
    setTeamActionMessage(null);

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
      setTeamActionMessage(`Einladung an ${created.email} gesendet.`);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Einladung fehlgeschlagen.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, nextRole: RoleName) => {
    if (nextRole === member.roleName) return;

    setSavingRoleForId(member.id);
    setTeamActionMessage(null);

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
      setTeamActionMessage(err instanceof Error ? err.message : "Rolle konnte nicht geändert werden.");
    } finally {
      setSavingRoleForId(null);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!window.confirm(`${member.name ?? member.email} wirklich aus dem Team entfernen?`)) {
      return;
    }

    setRemovingId(member.id);
    setTeamActionMessage(null);

    try {
      const response = await apiFetch(`/api/team/${member.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Mitglied konnte nicht entfernt werden."));
      }

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setTeamActionMessage(`${member.name ?? member.email} wurde entfernt.`);
    } catch (err) {
      setTeamActionMessage(err instanceof Error ? err.message : "Mitglied konnte nicht entfernt werden.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleSave = async () => {
    if (savingRef.current || loading) return;
    savingRef.current = true;
    setSaving(true);
    setMessage(null);

    try {
      const yellow = Number(yellowThreshold);
      const red = Number(redThreshold);

      if (
        Number.isNaN(yellow) ||
        Number.isNaN(red) ||
        yellow < 0 ||
        red < 0 ||
        yellow > 100 ||
        red > 100 ||
        yellow >= red
      ) {
        throw new Error("Gelber Schwellenwert muss kleiner als der rote sein (0–100).");
      }

      const response = await apiFetch(API_SETTINGS, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toneOfVoice: tone,
          autoAnalyzeNewIssues: autoAnalysis,
          thresholdYellow: yellow,
          thresholdRed: red,
        } satisfies SettingsApiDto),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Speichern fehlgeschlagen (${response.status}).`);
      }

      const refresh = await apiFetch(API_SETTINGS);
      if (!refresh.ok) {
        throw new Error("Gespeichert, aber erneutes Laden ist fehlgeschlagen.");
      }
      const saved = (await refresh.json()) as SettingsApiDto;
      applySettingsToForm(saved, {
        setTone,
        setAutoAnalysis,
        setYellowThreshold,
        setRedThreshold,
      });
      setMessage("Einstellungen erfolgreich gespeichert.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Speichern fehlgeschlagen. Bitte versuche es erneut.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const pageBackground =
    theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";

  const cardBackground =
    theme === "dark" ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200";

  const inputClass =
    theme === "dark"
      ? "w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none"
      : "w-full rounded border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none";

  const rowBorder = theme === "dark" ? "border-slate-700" : "border-slate-200";

  const themeButtonLabel = theme === "dark" ? "Zum White-Mode wechseln" : "Zum Dark-Mode wechseln";

  return (
    <Box className={`min-h-screen ${pageBackground}`}>
      <TopNavigationBar />

      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <Text weight="bold">Einstellungen</Text>

          {loading ? (
            <Box className="mt-6">
              <Text type="xs">Lade aktuelle Einstellungen…</Text>
            </Box>
          ) : (
            <>
              <Box className="mt-6 grid gap-4 md:grid-cols-2">
                <Card className={`p-6 ${cardBackground}`}>
                  <Text weight="bold">Darstellung</Text>

                  <Box className="mt-4 space-y-4">
                    <Box className="flex items-center justify-between gap-3">
                      <Text type="xs">Theme</Text>
                      <Button label={themeButtonLabel} onClick={toggleTheme} variant="secondary" />
                    </Box>

                    <Box className="rounded border border-slate-300/30 p-3">
                      <Text type="xs">
                        Aktueller Modus:{" "}
                        <strong>{theme === "dark" ? "Darkmode" : "Whitemode"}</strong>
                      </Text>
                    </Box>
                  </Box>
                </Card>

                <Card className={`p-6 ${cardBackground}`}>
                  <Text weight="bold">KI-Konfiguration</Text>

                  <Box className="mt-4 space-y-4">
                    <label className="block">
                      <Box className="mb-2">
                        <Text type="xs">Tonalität der Produkttexte</Text>
                      </Box>
                      <select
                        value={tone}
                        onChange={(event) => setTone(event.target.value)}
                        className={inputClass}
                      >
                        <option value="Locker">Locker</option>
                        <option value="Formell und sachlich">Formell und sachlich</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={autoAnalysis}
                        onChange={(event) => setAutoAnalysis(event.target.checked)}
                        className="h-4 w-4"
                      />
                      <Text type="xs">Automatische Analyse</Text>
                    </label>
                  </Box>
                </Card>

                <Card className={`p-6 ${cardBackground}`}>
                  <Text weight="bold">Retouren-Ampel</Text>

                  <Box className="mt-4 space-y-4">
                    <label className="block">
                      <Box className="mb-2">
                        <Text type="xs">Gelbe Warnung ab (%)</Text>
                      </Box>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={yellowThreshold}
                        onChange={(event) => {
                          const raw = event.target.value;
                          setYellowThreshold(raw === "" ? "" : Number(raw));
                        }}
                        className={inputClass}
                        placeholder="z. B. 10"
                      />
                    </label>

                    <label className="block">
                      <Box className="mb-2">
                        <Text type="xs">Rote Warnung ab (%)</Text>
                      </Box>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={redThreshold}
                        onChange={(event) => {
                          const raw = event.target.value;
                          setRedThreshold(raw === "" ? "" : Number(raw));
                        }}
                        className={inputClass}
                        placeholder="z. B. 25"
                      />
                    </label>
                  </Box>
                </Card>
              </Box>

              <Card className={`mt-6 p-6 ${cardBackground}`}>
                <Text weight="bold">Team</Text>
                <Box className="mt-1">
                  <Text type="xs">
                    {teamLoading
                      ? "Lädt…"
                      : `${members.length} Mitglied${members.length === 1 ? "" : "er"}`}
                  </Text>
                </Box>

                {teamError && (
                  <Box className="mt-3">
                    <Text type="xs" color="danger">
                      {teamError}
                    </Text>
                  </Box>
                )}

                {!teamLoading && !teamError && (
                  <>
                    {isAdmin && (
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
                          label={inviting ? "Sendet…" : "Einladen"}
                          variant="highlight"
                          disabled={inviting}
                        />
                      </form>
                    )}

                    {inviteError && (
                      <Box className="mt-2">
                        <Text type="xs" color="danger">
                          {inviteError}
                        </Text>
                      </Box>
                    )}

                    {teamActionMessage && (
                      <Box className="mt-2">
                        <Text type="xs">{teamActionMessage}</Text>
                      </Box>
                    )}

                    <Box className={`mt-4 divide-y ${rowBorder}`}>
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
                            {isAdmin ? (
                              <select
                                value={member.roleName}
                                disabled={savingRoleForId === member.id}
                                onChange={(e) => handleRoleChange(member, e.target.value as RoleName)}
                                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
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
                    </Box>
                  </>
                )}
              </Card>

              <Box className="mt-6 flex flex-col gap-3">
                {message && (
                  <Box
                    className={message.includes("erfolgreich") ? "text-green-600" : "text-red-600"}
                  >
                    <Text type="xs">{message}</Text>
                  </Box>
                )}
                <Button
                  label={saving ? "Speichern..." : "Speichern"}
                  onClick={handleSave}
                  disabled={saving || loading}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
