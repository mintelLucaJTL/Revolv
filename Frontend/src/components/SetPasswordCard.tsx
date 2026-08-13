import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
} from "@jtl-software/platform-ui-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import PasswordField from "./PasswordField";
import { apiFetch } from "../utils/api";

const inputClassName =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-900";

interface SetPasswordCardProps {
  title: string;
  description?: string;
  submitLabel: string;
  missingTokenMessage: string;
}

// Gemeinsame Form für "Passwort zurücksetzen" und "Team-Einladung annehmen" - beide rufen
// denselben Backend-Endpunkt mit demselben Token-Mechanismus auf (siehe TeamController.cs-
// Kommentar), unterscheiden sich nur in Überschrift/Text, damit ein neu eingeladenes
// Teammitglied nicht denkt, es müsse ein "vergessenes" Passwort zurücksetzen.
export default function SetPasswordCard({
  title,
  description,
  submitLabel,
  missingTokenMessage,
}: SetPasswordCardProps) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setError("");

    if (!token) {
      setError(missingTokenMessage);
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Bitte beide Passwort-Felder ausfüllen.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Passwort konnte nicht gesetzt werden.");
      }

      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passwort konnte nicht gesetzt werden.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-12 dark:bg-slate-950 dark:text-slate-100">
      <Card className="max-w-[450px] w-full dark:bg-slate-900 dark:border-slate-700">
        <CardHeader className="items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <KeyRound size={24} strokeWidth={1.5} />
          </span>
          <CardTitle className="dark:text-slate-100">{title}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 mt-4">
          {description ? (
            <Text type="small" color="muted">
              {description}
            </Text>
          ) : null}

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <Text type="small">Passwort</Text>
            <PasswordField
              inputClassName={inputClassName}
              placeholder="••••••••"
              name="new-password"
              autoComplete="new-password"
              value={newPassword}
              disabled={isSubmitting}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Text type="small">Passwort wiederholen</Text>
            <PasswordField
              inputClassName={inputClassName}
              placeholder="••••••••"
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              disabled={isSubmitting}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

            <Button
              type="submit"
              label={isSubmitting ? `${submitLabel}…` : submitLabel}
              variant="highlight"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            />
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
