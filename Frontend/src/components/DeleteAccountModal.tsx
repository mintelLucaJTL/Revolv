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
}

// Confirmation phrase for the destructive "delete account" action.
const CONFIRM_PHRASE = "LÖSCHEN";

export default function DeleteAccountModal({ isOpen, onClose, onConfirm }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText("");
    setError("");
    onClose();
  };

  // DELETE /api/user/me - lets the user delete their own account.
  const handleConfirm = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setError("");

    try {
      await onConfirm();
    } catch {
      setError("Konto konnte nicht gelöscht werden. Bitte erneut versuchen.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <Card className="w-full max-w-sm border border-red-100 dark:border-red-900/50">
        <CardHeader>
          <CardTitle>Konto endgültig löschen</CardTitle>
          <Text type="small" color="muted">
            Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden dauerhaft
            entfernt.
          </Text>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="block">
            <Text type="xs" color="muted">
              Gib zur Bestätigung <strong>{CONFIRM_PHRASE}</strong> ein
            </Text>
            <input
              autoFocus
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder={CONFIRM_PHRASE}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              disabled={isDeleting}
            />
          </label>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button label="Abbrechen" variant="ghost" onClick={handleClose} disabled={isDeleting} />
            <Button
              label={isDeleting ? "Wird gelöscht…" : "Konto endgültig löschen"}
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isConfirmed || isDeleting}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
