import { useEffect, useRef, useState } from "react";
import { Box, Card, Button, Text } from "@jtl-software/platform-ui-react";
import { apiFetch } from "../utils/api";

// DTO for the settings API.
interface SettingsApiDto {
  toneOfVoice: string;
  autoAnalyzeNewIssues: boolean;
  thresholdYellow: number;
  thresholdRed: number;
  minNewReturnsForReanalyze: number;
  significantReasonShiftPercentagePoints: number;
}

type ThemeMode = "light" | "dark";

// API endpoint for the settings.
const API_SETTINGS = "/api/settings";

// Must match RevolvAPI ToneOfVoiceOptions.Allowed.
const ALLOWED_TONES = ["Locker", "Formell und sachlich"] as const;

const DEFAULT_TONE = "Formell und sachlich";

function normalizeTone(tone: string | undefined): string {
  return ALLOWED_TONES.includes(tone as (typeof ALLOWED_TONES)[number])
    ? (tone as string)
    : DEFAULT_TONE;
}

// Slider statt Zahlenfeld für alle numerischen Settings - Wert + Min/Max sind auf einen Blick
// sichtbar, ohne dass man erst reintippen und die Validierung abwarten muss.
function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number | "";
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const display = value === "" ? min : value;
  return (
    <label className="block">
      <Box className="mb-2 flex items-center justify-between">
        <Text type="xs">{label}</Text>
        <Text type="xs" weight="bold">
          {display}
          {unit}
        </Text>
      </Box>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={display}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-blue-600"
      />
      <Box className="mt-1 flex justify-between">
        <Text type="xs" color="muted">
          {min}
          {unit}
        </Text>
        <Text type="xs" color="muted">
          {max}
          {unit}
        </Text>
      </Box>
    </label>
  );
}

// Applies the settings to the form.
function applySettingsToForm(
  data: SettingsApiDto,
  setters: {
    setTone: (v: string) => void;
    setAutoAnalysis: (v: boolean) => void;
    setYellowThreshold: (v: number) => void;
    setRedThreshold: (v: number) => void;
    setMinNewReturns: (v: number) => void;
    setSignificantShift: (v: number) => void;
  },
) {
  setters.setTone(normalizeTone(data.toneOfVoice));
  setters.setAutoAnalysis(Boolean(data.autoAnalyzeNewIssues));
  setters.setYellowThreshold(Number(data.thresholdYellow));
  setters.setRedThreshold(Number(data.thresholdRed));
  setters.setMinNewReturns(Number(data.minNewReturnsForReanalyze));
  setters.setSignificantShift(Number(data.significantReasonShiftPercentagePoints));
}

export default function Settings() {
  const [tone, setTone] = useState("");
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [yellowThreshold, setYellowThreshold] = useState<number | "">("");
  const [redThreshold, setRedThreshold] = useState<number | "">("");
  const [minNewReturns, setMinNewReturns] = useState<number | "">("");
  const [significantShift, setSignificantShift] = useState<number | "">("");
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
          setMinNewReturns,
          setSignificantShift,
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
      const minReturns = Number(minNewReturns);
      const shift = Number(significantShift);

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

      if (Number.isNaN(minReturns) || minReturns < 3 || minReturns > 10) {
        throw new Error("Mindestanzahl neuer Retouren muss zwischen 3 und 10 liegen.");
      }

      if (Number.isNaN(shift) || shift < 14 || shift > 30) {
        throw new Error("Prozentpunkte müssen zwischen 14 und 30 liegen.");
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
          minNewReturnsForReanalyze: minReturns,
          significantReasonShiftPercentagePoints: shift,
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
        setMinNewReturns,
        setSignificantShift,
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

  const cardBackground =
    theme === "dark" ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200";

  const inputClass =
    theme === "dark"
      ? "w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none"
      : "w-full rounded border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none";

  const themeButtonLabel = theme === "dark" ? "Zum White-Mode wechseln" : "Zum Dark-Mode wechseln";

  return (
    <>
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
                  <Text weight="bold">Retouren-Ampel-Settings</Text>

                  <Box className="mt-4 space-y-5">
                    <SliderField
                      label="Gelbe Warnung ab"
                      value={yellowThreshold}
                      min={0}
                      max={100}
                      step={0.5}
                      unit="%"
                      onChange={setYellowThreshold}
                    />

                    <SliderField
                      label="Rote Warnung ab"
                      value={redThreshold}
                      min={0}
                      max={100}
                      step={0.5}
                      unit="%"
                      onChange={setRedThreshold}
                    />
                  </Box>
                </Card>

                <Card className={`p-6 ${cardBackground}`}>
                  <Text weight="bold">Retouren-Analyse-Settings</Text>
                  <Box className="mt-1">
                    <Text type="xs" color="muted">
                      Nach einer live in WAWI übernommenen Beschreibung ist eine neue KI-Analyse
                      erst wieder möglich, wenn BEIDE Bedingungen erfüllt sind.
                    </Text>
                  </Box>

                  <Box className="mt-4 space-y-5">
                    <SliderField
                      label="Mindestanzahl neuer Retouren"
                      value={minNewReturns}
                      min={3}
                      max={10}
                      step={1}
                      onChange={setMinNewReturns}
                    />

                    <SliderField
                      label="Mindestverschiebung eines Retourengrundes"
                      value={significantShift}
                      min={14}
                      max={30}
                      step={1}
                      unit="%"
                      onChange={setSignificantShift}
                    />
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
    </>
  );
}
