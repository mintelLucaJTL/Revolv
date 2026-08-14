import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Text, Button } from "@jtl-software/platform-ui-react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

interface ActionPlanItem {
  articleId: number;
  articleNumber: string;
  name: string;
  returnRatePercent: number;
  estimatedReturnCost: number;
  openItemCount: number;
  nextStepText: string;
  recommendationId: number;
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-slate-800">
      <div className="h-4 w-6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

// Aktionsplan: eine priorisierte To-Do-Liste über alle Artikel hinweg, statt sich Artikel für
// Artikel durch die Retourenanalyse klicken zu müssen. Sortierung nach geschätztem
// Einsparpotenzial (Retourenmenge × Verkaufspreis) beantwortet direkt "was lohnt sich am
// meisten, als nächstes anzugehen?".
export default function Aktionsplan() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // Kleiner Tooltip, der der Maus folgt, solange über einer Zeile gehovert wird - zusätzlich
  // zum Glow-Hover, damit sofort klar ist, dass die Zeile anklickbar ist.
  const [hoverTip, setHoverTip] = useState<{ id: number; x: number; y: number } | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/dashboard/action-plan");

      if (!response.ok) {
        throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
      }

      setItems((await response.json()) as ActionPlanItem[]);
    } catch (err) {
      console.error("Fehler beim Laden des Aktionsplans:", err);
      setError(err instanceof Error ? err.message : "Aktionsplan konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {error ? (
        <Card className="dark:bg-slate-900 dark:border-slate-700">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-sm text-red-600">
            <span>{error}</span>
            <Button label="Erneut versuchen" onClick={() => void loadItems()} />
          </CardContent>
        </Card>
      ) : (
        <Card className="dark:bg-slate-900 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Produkte nach Wichtigkeit priorisiert</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div>
                {Array.from({ length: 5 }, (_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <CheckCircle2 className="text-green-500" size={32} />
                <Text weight="semibold">Alles erledigt</Text>
                <Text type="xs" color="muted">
                  Aktuell gibt es keine offenen KI-Empfehlungen. Neue Vorschläge landen
                  automatisch hier, sobald welche entstehen.
                </Text>
              </div>
            ) : (
              <div>
                {items.map((item, index) => (
                  <button
                    key={item.articleId}
                    type="button"
                    onClick={() => navigate(`/retouren-analyse?open=${item.articleId}`)}
                    onMouseMove={(e) =>
                      setHoverTip({ id: item.articleId, x: e.clientX, y: e.clientY })
                    }
                    onMouseLeave={() => setHoverTip((current) => (current?.id === item.articleId ? null : current))}
                    className="group relative flex w-full items-center gap-4 border-b border-slate-100 px-4 py-4 text-left transition-all duration-150 last:border-b-0 hover:z-10 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-transparent hover:bg-blue-50 hover:shadow-[0_0_24px_-6px_rgba(59,130,246,0.55)] dark:border-slate-800 dark:hover:bg-blue-950/40 dark:hover:shadow-[0_0_28px_-4px_rgba(96,165,250,0.7)]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {item.name}{" "}
                        <span className="font-normal text-slate-400 dark:text-slate-500">
                          ({item.articleNumber})
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      {item.openItemCount} offen
                    </span>

                    <ChevronRight
                      className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400"
                      size={18}
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hoverTip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700"
          style={{ left: hoverTip.x + 16, top: hoverTip.y + 16 }}
        >
          Zum Artikel in der Retourenanalyse navigieren →
        </div>
      )}
    </div>
  );
}
