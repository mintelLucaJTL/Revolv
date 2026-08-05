import { useState, useEffect } from "react";
import { Box, Card, CardContent, CardHeader, CardTitle } from "@jtl-software/platform-ui-react";
import { apiFetch } from "../utils/api";
import { getReasonColor } from "../utils/reasonColors";

interface LatestReturnItem {
  articleNumber: string;
  name: string;
  issueText: string;
}

function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
      </td>
    </tr>
  );
}

export default function LatestReturnsList() {
  const [returns, setReturns] = useState<LatestReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          Live-Feed der zuletzt eingegangenen Problemfälle
        </Box>

        {error ? (
          <div className="h-52 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : !isLoading && returns.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Keine aktuellen Retouren vorhanden.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Artikel-Nr.
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Produktname
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Retourengrund
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {isLoading
                  ? Array.from({ length: 3 }, (_, index) => (
                      <TableRowSkeleton key={`latest-returns-skeleton-${index}`} />
                    ))
                  : returns.map((item, index) => (
                      <tr
                        key={`${item.articleNumber}-${index}`}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <td className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">
                          {item.articleNumber}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: getReasonColor(item.issueText) }}
                              aria-hidden="true"
                            />
                            {item.issueText}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
