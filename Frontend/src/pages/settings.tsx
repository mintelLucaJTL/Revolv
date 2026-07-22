import { useEffect, useState } from "react";
import { Box, Card, Button, Text } from "@jtl-software/platform-ui-react";
import Sidebar from "../components/Sidebar";
import TopNavigationBar from "../components/TopNavigationBar";

interface SettingsApiDto {
  tone: string;
  autoAnalysis: boolean;
  yellowThreshold: number;
  redThreshold: number;
}

export default function Settings() {
  const [tone, setTone] = useState("Du-Form");
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [yellowThreshold, setYellowThreshold] = useState(10);
  const [redThreshold, setRedThreshold] = useState(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) {
          throw new Error("Einstellungen konnten nicht geladen werden.");
        }
        const data = (await response.json()) as SettingsApiDto;
        setTone(data.tone ?? "Du-Form");
        setAutoAnalysis(data.autoAnalysis ?? false);
        setYellowThreshold(data.yellowThreshold ?? 10);
        setRedThreshold(data.redThreshold ?? 25);
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
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone,
          autoAnalysis,
          yellowThreshold,
          redThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error("Speichern fehlgeschlagen.");
      }

      setMessage("Einstellungen erfolgreich gespeichert.");
    } catch (error) {
      console.error(error);
      setMessage("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50">
      <TopNavigationBar />
      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <Text weight="bold">Einstellungen</Text>

          <Box className="grid gap-4 mt-6 md:grid-cols-2">
            <Card className="p-6">
              <Text weight="bold">KI-Konfiguration</Text>

              <Box className="space-y-4 mt-4">
                <label className="block">
                  <Box className="mb-2">
                    <Text type="xs">Tonalität der Produkttexte</Text>
                  </Box>
                  <select
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                  >
                    <option value="Du-Form">Du-Form</option>
                    <option value="Sie-Form">Sie-Form</option>
                    <option value="Locker">Locker</option>
                    <option value="Formell">Formell</option>
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

            <Card className="p-6">
              <Text weight="bold">Retouren-Ampel</Text>

              <Box className="space-y-4 mt-4">
                <label className="block">
                  <Box className="mb-2">
                    <Text type="xs">Gelbe Warnung ab (%)</Text>
                  </Box>
                  <input
                    type="number"
                    value={yellowThreshold}
                    onChange={(event) => setYellowThreshold(Number(event.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                    placeholder="z. B. 10"
                  />
                </label>

                <label className="block">
                  <Box className="mb-2">
                    <Text type="xs">Rote Warnung ab (%)</Text>
                  </Box>
                  <input
                    type="number"
                    value={redThreshold}
                    onChange={(event) => setRedThreshold(Number(event.target.value))}
                    className="w-full rounded border border-slate-200 px-3 py-2"
                    placeholder="z. B. 25"
                  />
                </label>
              </Box>
            </Card>
          </Box>

          <Box className="mt-6 flex flex-col gap-3">
            {message && (
              <Box className={message.includes("erfolgreich") ? "text-green-600" : "text-red-600"}>
                <Text type="xs">{message}</Text>
              </Box>
            )}
            <Button label={saving ? "Speichern..." : "Speichern"} onClick={handleSave} disabled={saving || loading} />
          </Box>

          {loading && (
            <Box className="mt-4">
              <Text type="xs">Lade Einstellungen…</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}