import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Text,
} from "@jtl-software/platform-ui-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const inputClassName =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-900";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    try {
      // Kein navigate() hier - PublicOnlyRoute leitet automatisch zu /welcome weiter, sobald
      // login() den Auth-Status setzt (siehe App.tsx). Ein eigener navigate()-Aufruf würde mit
      // diesem reaktiven Redirect um die URL konkurrieren.
      await login(email, password);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Backend nicht erreichbar. Starte RevolvAPI mit 'dotnet run' im Ordner RevolvAPI (http://localhost:5215).",
        );
      } else {
        setError(err instanceof Error ? err.message : "Login fehlgeschlagen.");
      }
    }
  };

  return (
    <Box className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 dark:text-slate-100">
      {/* Abgewandelte, dauerhafte Version der Welcome-Splash-Animation (welcome.tsx) als
          dezenter Hintergrund statt einmaligem Vollbild-Intro - leise Ringe pulsieren
          endlos hinter der Karte, statt einmal aufzublitzen und zu verschwinden. */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="relative flex h-72 w-72 items-center justify-center opacity-[0.15] dark:opacity-[0.2]">
          <span className="absolute h-72 w-72 rounded-full border-2 border-blue-500 animate-revolv-ring-pulse" />
          <span
            className="absolute h-72 w-72 rounded-full border-2 border-blue-500 animate-revolv-ring-pulse"
            style={{ animationDelay: "0.8s" }}
          />
          <div className="flex h-40 w-40 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-500 to-blue-700 blur-2xl" />
        </div>
      </div>

      <Box className="relative flex flex-col items-center justify-center flex-1 p-12">
        <Card className="max-w-[450px] w-full dark:bg-slate-900 dark:border-slate-700">
          <CardHeader className="items-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <LogIn size={26} strokeWidth={1.5} />
            </span>
            <CardTitle className="dark:text-slate-100">Willkommen zurück</CardTitle>
            <Badge label="Anmeldung" variant="info"></Badge>
          </CardHeader>

          <Separator />

          <CardContent className="flex flex-col gap-4 mt-4">
            <Text type="small" color="muted">
              Bitte melde dich an, um fortzufahren.
            </Text>

            <Text type="small">E-Mail</Text>
            <input
              className={inputClassName}
              placeholder="du@beispiel.de"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Text type="small">Passwort</Text>
            <input
              className={inputClassName}
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="text-right text-sm">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Passwort vergessen?
              </button>
            </div>

            {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

            <Button label="Anmelden" variant="highlight" onClick={handleLogin} />
            <div className="text-center text-sm text-muted-foreground dark:text-slate-400">
              Noch kein Konto? Registriere dich unten.
            </div>
            <Button
              label="Konto erstellen"
              variant="outline"
              onClick={() => navigate("/register")}
            />
            <Separator />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
