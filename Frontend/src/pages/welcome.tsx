import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Zeitpunkte in ms relativ zum Mount: erst ausblenden, dann erst navigieren, damit die
// Fade-out-Transition sichtbar abgespielt wird statt vom Routenwechsel abgeschnitten zu werden.
const FADE_OUT_AFTER_MS = 1700;
const NAVIGATE_AFTER_MS = 2150;

export default function WelcomePage() {
  const navigate = useNavigate();
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), FADE_OUT_AFTER_MS);
    const redirectTimer = setTimeout(
      () => navigate("/dashboard", { replace: true }),
      NAVIGATE_AFTER_MS,
    );

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 ${
        fadingOut ? "animate-revolv-fade-out" : ""
      }`}
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute h-24 w-24 rounded-2xl border-2 border-blue-500/50 dark:border-blue-500/60 animate-revolv-ring-pulse" />
        <span
          className="absolute h-24 w-24 rounded-2xl border-2 border-blue-500/50 dark:border-blue-500/60 animate-revolv-ring-pulse"
          style={{ animationDelay: "0.55s" }}
        />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_60px_rgba(59,130,246,0.35)] dark:shadow-[0_0_60px_rgba(59,130,246,0.55)] animate-revolv-logo-in">
          <span className="text-4xl font-bold text-white">R</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 animate-revolv-text-in">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">Revolv</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">Dashboard wird geladen …</span>
      </div>

      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-blue-500 animate-ai-scan" />
      </div>
    </div>
  );
}
