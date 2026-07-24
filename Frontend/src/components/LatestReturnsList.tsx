import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
} from "@jtl-software/platform-ui-react";
import type { ITableColumnProps } from "@jtl-software/platform-ui-react";
import { apiFetch } from "../utils/api";

interface LatestReturnItem {
  articleNumber: string;
  name: string;
  issueText: string;
}

const columns: ITableColumnProps<LatestReturnItem>[] = [
  {
    title: "Artikel-Nr.",
    dataIndex: "articleNumber",
    key: "articleNumber",
  },
  {
    title: "Produktname",
    dataIndex: "name",
    key: "name",
    render: (value) => (
      <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    ),
  },
  {
    title: "Retourengrund",
    dataIndex: "issueText",
    key: "issueText",
  },
];

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
        <Box className="text-sm text-slate-500 mb-4 dark:text-slate-400">
          Live-Feed der zuletzt eingegangenen Problemfälle
        </Box>

        {error ? (
          <div className="p-4 text-center text-sm text-red-600">{error}</div>
        ) : (
          <Table
            columns={columns}
            dataSource={returns}
            isLoading={isLoading}
            size="sm"
            emptyContent={
              <div className="p-4 text-center text-sm text-slate-500">
                Keine aktuellen Retouren vorhanden.
              </div>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
