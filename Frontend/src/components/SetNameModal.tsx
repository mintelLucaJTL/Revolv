import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
} from "@jtl-software/platform-ui-react";

interface Props {
  isOpen: boolean;
  onSaved: (name: string) => void;
}

// Blocking popup shown once to users that don't have a display name yet
// (e.g. accounts created before this field existed). Has no close/cancel
// button on purpose, since a name is now required to use the app.
export default function SetNameModal({ isOpen, onSaved }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte gib einen Namen ein.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSaved(trimmed);
    } catch {
      setError("Name konnte nicht gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Wie sollen wir dich nennen?</CardTitle>
          <Text type="small" color="muted">
            Bitte gib einmalig deinen Namen ein, damit wir ihn im Header anzeigen können.
          </Text>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            autoFocus
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Luke Jansen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <Button
            label={isSaving ? "Speichert…" : "Speichern"}
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
