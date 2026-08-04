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
import { apiFetch } from "../utils/api";

const inputClassName =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-900";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");

    if (!token) {
      setError("Kein gültiger Reset-Link. Bitte fordere einen neuen Link an.");
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

    try {
      const response = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Passwort konnte nicht zurückgesetzt werden.");
      }

      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passwort konnte nicht zurückgesetzt werden.");
    }
  };

  return (
    <Box className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-12 dark:bg-slate-950 dark:text-slate-100">
      <Card className="max-w-[450px] w-full dark:bg-slate-900 dark:border-slate-700">
        <CardHeader className="items-center">
          <CardTitle className="dark:text-slate-100">Neues Passwort vergeben</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 mt-4">
          <Text type="small">Neues Passwort</Text>
          <input
            className={inputClassName}
            placeholder="••••••••"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Text type="small">Passwort wiederholen</Text>
          <input
            className={inputClassName}
            placeholder="••••••••"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

          <Button label="Passwort speichern" variant="default" onClick={handleSubmit} />
        </CardContent>
      </Card>
    </Box>
  );
}
