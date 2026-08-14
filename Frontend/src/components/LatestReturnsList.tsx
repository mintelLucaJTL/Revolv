import { useState, useEffect } from "react";
import { Box, Card, CardContent, CardHeader, CardTitle } from "@jtl-software/platform-ui-react";
import { RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

interface LatestReturnItem {
  articleNumber: string;
  name: string;
  returnedAt: string;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));

  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;

  const days = Math.round(hours / 24);
  return `vor ${days} Tg.`;
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-3 w-14 flex-shrink-0 rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

export default function LatestReturnsList() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<LatestReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tooltip, der der Maus folgt, solange über einer Zeile gehovert wird - wie in Aktionsplan/
  // Retouren-Analyse, damit sofort klar ist, dass die Zeile anklickbar ist.
  const [hoverTip, setHoverTip] = useState<{ key: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const fetchLatesReturns = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch("/api/dashboard/latest-returns");
        if (!response.ok) {
          throw new Error(`Failed to fetch latest returns (HTTP error: ${response.status})`);
        }
        const data = await response.json();
        setReturns(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    // Start the fetch operation
    void fetchLatesReturns();
  }, []);

  return (
    <Card className="w-full h-full flex flex-col dark:bg-slate-900 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="dark:text-slate-100">Letzte Retouren</CardTitle>
      </CardHeader>
      <CardContent>
        <Box className="text-sm text-slate-500 mb-3 dark:text-slate-400">
          Die zuletzt eingegangenen Problemfälle
        </Box>

        {error ? (
          <div className="h-52 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : !isLoading && returns.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Keine aktuellen Retouren vorhanden.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => (
                  <RowSkeleton key={`latest-returns-skeleton-${index}`} />
                ))
              : returns.map((item, index) => {
                  const rowKey = `${item.articleNumber}-${index}`;
                  return (
                    <button
                      key={rowKey}
                      type="button"
                      onClick={() =>
                        navigate(`/retouren-analyse?open=${encodeURIComponent(item.articleNumber)}`)
                      }
                      onMouseMove={(e) => setHoverTip({ key: rowKey, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() =>
                        setHoverTip((current) => (current?.key === rowKey ? null : current))
                      }
                      className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:z-10 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-50 hover:shadow-[0_0_20px_-6px_rgba(59,130,246,0.55)] dark:hover:bg-blue-950/40 dark:hover:shadow-[0_0_24px_-4px_rgba(96,165,250,0.7)]"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500">
                        <RotateCcw size={15} aria-hidden="true" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {item.articleNumber}
                        </p>
                      </div>

                      <span className="flex-shrink-0 whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(item.returnedAt)}
                      </span>
                    </button>
                  );
                })}
          </div>
        )}
      </CardContent>

      {hoverTip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700"
          style={{ left: hoverTip.x + 16, top: hoverTip.y + 16 }}
        >
          Zum Artikel navigieren →
        </div>
      )}
    </Card>
  );
}
