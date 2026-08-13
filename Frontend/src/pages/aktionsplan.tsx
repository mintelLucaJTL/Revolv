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
                    className="flex w-full items-center gap-4 border-b border-slate-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
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

                    <ChevronRight className="shrink-0 text-slate-300 dark:text-slate-600" size={18} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
