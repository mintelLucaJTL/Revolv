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
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting: boolean;
  error: string | null;
}

// Confirmation phrase for overwriting the live, customer-facing WAWI description.
const CONFIRM_PHRASE = "ÜBERNEHMEN";

export default function PushDescriptionToWawiModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: Props) {
  const [confirmText, setConfirmText] = useState("");

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleClose = () => {
    if (isSubmitting) return;
    setConfirmText("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!isConfirmed || isSubmitting) return;
    await onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <Card className="w-full max-w-sm border border-amber-100 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle>In WAWI übernehmen</CardTitle>
          <Text type="small" color="muted">
            Überschreibt die aktuelle, live im Shop sichtbare Artikelbeschreibung mit dem
            KI-Vorschlag. Das passiert sofort und kann in Revolv nicht automatisch rückgängig
            gemacht werden.
          </Text>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="block">
            <Text type="xs" color="muted">
              Gib zur Bestätigung <strong>{CONFIRM_PHRASE}</strong> ein
            </Text>
            <input
              autoFocus
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder={CONFIRM_PHRASE}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleConfirm();
              }}
              disabled={isSubmitting}
            />
          </label>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button label="Abbrechen" variant="ghost" onClick={handleClose} disabled={isSubmitting} />
            <Button
              label={isSubmitting ? "Übernimmt…" : "In WAWI übernehmen"}
              variant="destructive"
              onClick={() => void handleConfirm()}
              disabled={!isConfirmed || isSubmitting}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
