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

// Card ist immer hell (siehe unten), daher hier bewusst kein dark:-Pfad wie bei den übrigen
// Formularen der App.
const inputClassName =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500";

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
    // Bewusst immer dunkel, unabhängig vom Theme-Toggle der restlichen App - das weiße
    // Anmelde-Popup soll dagegen hervorstechen, nicht mit einem hellen Hintergrund verschmelzen.
    <Box className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-12">
      {/* Abgewandelte Version der Welcome-Splash-Animation (welcome.tsx): R-Logo + ausgeschriebener
          Schriftzug spielen einmal ein, die Ringe pulsieren danach endlos weiter (animate-revolv-
          ring-pulse ist bereits als Endlosschleife definiert) statt wie beim Splash zu verschwinden. */}
      <div className="relative z-10 mb-10 flex items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute h-20 w-20 rounded-2xl border-2 border-blue-400/60 animate-revolv-ring-pulse" />
          <span
            className="absolute h-20 w-20 rounded-2xl border-2 border-blue-400/60 animate-revolv-ring-pulse"
            style={{ animationDelay: "0.55s" }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_60px_rgba(59,130,246,0.5)] animate-revolv-logo-in">
            <span className="text-3xl font-bold text-white">R</span>
          </div>
        </div>
        <span className="text-3xl font-bold tracking-wide text-white animate-revolv-text-in">
          Revolv
        </span>
      </div>

      {/* Card bewusst immer hell (kein dark:-Varianten) - siehe Kommentar oben. */}
      <Card className="relative z-10 max-w-[450px] w-full bg-white border-slate-200">
        <CardHeader className="items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <LogIn size={26} strokeWidth={1.5} />
          </span>
          <CardTitle className="text-black">Willkommen zurück</CardTitle>
          <Badge label="Anmeldung" variant="info"></Badge>
        </CardHeader>

     

        <CardContent className="flex flex-col gap-4 mt-4">
          <p className="text-black text-sm">
            Bitte melde dich an, um fortzufahren.
          </p>

          <label className="text-black text-sm font-medium">E-Mail</label>
          <input
            className={inputClassName}
            placeholder="du@beispiel.de"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="text-black text-sm font-medium">Passwort</label>
          <div className="relative">
            <input
              className={`${inputClassName} pr-32`}
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Passwort vergessen?
            </button>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <Button label="Anmelden" variant="highlight" onClick={handleLogin} />
          <div className="text-center text-sm text-black">
            Noch kein Konto? Registriere dich unten.
          </div>
          <Button
            label="Konto erstellen"
            variant="outline"
            onClick={() => navigate("/register")}
          />
         
        </CardContent>
      </Card>
    </Box>
  );
}
