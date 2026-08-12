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
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

const inputClassName =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-900";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");

    if (!email) {
      setError("Bitte E-Mail-Adresse eingeben.");
      return;
    }

    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Immer die gleiche Erfolgsmeldung anzeigen, egal ob die E-Mail existiert
      // (siehe Backend: ForgotPassword gibt aus Sicherheitsgruenden immer 200 zurueck).
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anfrage fehlgeschlagen.");
    }
  };

  return (
    <Box className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-12 dark:bg-slate-950 dark:text-slate-100">
      <Card className="max-w-[450px] w-full dark:bg-slate-900 dark:border-slate-700">
        <CardHeader className="items-center">
          <CardTitle className="dark:text-slate-100">Passwort vergessen</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 mt-4">
          {submitted ? (
            <>
              <Text type="small">
                Falls ein Account existiert, haben wir einen Reset-Link gesendet.
              </Text>
              <Button
                label="Zurück zum Login"
                variant="outline"
                onClick={() => navigate("/login")}
              />
            </>
          ) : (
            <>
              <Text type="small" color="muted">
                Gib deine E-Mail-Adresse ein, um einen Link zum Zurücksetzen deines Passworts zu
                erhalten.
              </Text>

              <input
                className={inputClassName}
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

              <Button label="Link anfordern" variant="highlight" onClick={handleSubmit} />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
