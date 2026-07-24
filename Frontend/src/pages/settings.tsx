import { useEffect, useRef, useState } from "react";
import { Box, Card, Button, Text } from "@jtl-software/platform-ui-react";
import Sidebar from "../components/Sidebar";
import TopNavigationBar from "../components/TopNavigationBar";

// DTO for the settings API.
interface SettingsApiDto {
  toneOfVoice: string;
  autoAnalyzeNewIssues: boolean;
  thresholdYellow: number;
  thresholdRed: number;
}

type ThemeMode = "light" | "dark";

// API endpoint for the settings.
const API_SETTINGS = "http://localhost:5215/api/settings";

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
  setters.setTone(data.toneOfVoice ?? "Du-Form");
  setters.setAutoAnalysis(Boolean(data.autoAnalyzeNewIssues));
  setters.setYellowThreshold(Number(data.thresholdYellow));
  setters.setRedThreshold(Number(data.thresholdRed));
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
        const response = await fetch(API_SETTINGS);
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

      const response = await fetch(API_SETTINGS, {
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

      const refresh = await fetch(API_SETTINGS);
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
                        <option value="Du-Form">Du-Form</option>
                        <option value="Sie-Form">Sie-Form</option>
                        <option value="Locker">Locker</option>
                        <option value="Formell">Formell</option>
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
