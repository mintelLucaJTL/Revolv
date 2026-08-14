import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Zeitpunkte in ms relativ zum Mount: erst ausblenden, dann erst navigieren, damit die
// Fade-out-Transition sichtbar abgespielt wird statt vom Routenwechsel abgeschnitten zu werden.
const FADE_OUT_AFTER_MS = 1700;
const NAVIGATE_AFTER_MS = 2150;

// Leicht versetzte Start-/Position-Werte, damit die Partikel nicht wie eine einzige,
// mechanisch wiederholte Kopie wirken.
const PARTICLES = [
  { left: "18%", delay: "0s", size: 6 },
  { left: "38%", delay: "0.4s", size: 4 },
  { left: "62%", delay: "0.15s", size: 5 },
  { left: "80%", delay: "0.6s", size: 4 },
  { left: "50%", delay: "0.9s", size: 6 },
];

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 ${
        fadingOut ? "animate-revolv-fade-out" : ""
      }`}
    >
      {/* Aufsteigende Partikel, relativ zur Bühne unten mittig positioniert. */}
      <div className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-1/2 rounded-full bg-blue-400/70 dark:bg-blue-400/60 animate-revolv-particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Sanft atmender Glow hinter dem Logo, statt eines flachen Hintergrunds. */}
      <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-blue-400/30 blur-3xl dark:bg-blue-500/25 animate-revolv-glow-pulse" />

      <div className="relative flex h-40 w-40 items-center justify-center [perspective:900px]">
        <span className="absolute h-24 w-24 rounded-2xl border-2 border-blue-500/50 dark:border-blue-500/60 animate-revolv-ring-pulse" />
        <span
          className="absolute h-24 w-24 rounded-2xl border-2 border-blue-500/50 dark:border-blue-500/60 animate-revolv-ring-pulse"
          style={{ animationDelay: "0.55s" }}
        />

        {/* Äußerer Wrapper übernimmt das kontinuierliche 3D-Wippen nach dem Eintreten, der innere
            Block das einmalige 3D-Flip-In - getrennte Elemente, damit sich die beiden
            transform-Animationen nicht gegenseitig überschreiben. */}
        <div className="animate-revolv-logo-tilt [transform-style:preserve-3d]">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_60px_rgba(59,130,246,0.35)] dark:shadow-[0_0_60px_rgba(59,130,246,0.55)] animate-revolv-logo-in">
            <span className="text-4xl font-bold text-white">R</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 animate-revolv-text-in">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">Revolv</span>
        <span
          className="h-0.5 w-10 rounded-full bg-blue-500 dark:bg-blue-400 animate-revolv-underline-in"
          aria-hidden="true"
        />
        <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dashboard wird vorbereitet …
        </span>
      </div>

      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-blue-500 animate-ai-scan" />
      </div>
    </div>
  );
}
