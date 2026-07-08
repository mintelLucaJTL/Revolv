import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Avatar,
  Button,
  Separator,
  Stack,
  Text,
} from "@jtl-software/platform-ui-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  XAxis,
  YAxis,
} from "recharts";
import { Bell, Search } from "lucide-react";

type KpiStatus = "critical" | "warning" | "notice" | "healthy";

type KpiCard = {
  status: KpiStatus;
  title: string;
  dotClassName: string;
  metricText: string;
  trendText: string;
  trendColor: "danger" | "warning" | "success" | "info" | "muted" | "default";
};

type ReturnReasonDatum = { name: string; value: number };

type MonthlyCostPoint = { month: string; costEur: number };

type RecentReturn = {
  productName: string;
  customerId: string;
  returnReason: string;
  timestampIso: string;
};

function formatTimestamp(iso: string): string {
  // Keep it deterministic and readable (German locale, but safe as fallback).
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("de-DE");
}

function kpiConsoleNavigate(): void {
  // eslint-disable-next-line no-console
  console.log("Navigate to Details");
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const kpis: ReadonlyArray<KpiCard> = useMemo(
    () => [
      {
        status: "critical",
        title: "Critical",
        dotClassName: "bg-red-600",
        metricText: ">20%",
        trendText: "+4.2% vs. last month",
        trendColor: "danger",
      },
      {
        status: "warning",
        title: "Warning",
        dotClassName: "bg-orange-500",
        metricText: "12.8%",
        trendText: "+1.6% vs. last month",
        trendColor: "warning",
      },
      {
        status: "notice",
        title: "Notice",
        dotClassName: "bg-yellow-400",
        metricText: "8.1%",
        trendText: "-0.7% vs. last month",
        trendColor: "info",
      },
      {
        status: "healthy",
        title: "Healthy",
        dotClassName: "bg-emerald-500",
        metricText: "<5%",
        trendText: "-2.9% vs. last month",
        trendColor: "success",
      },
    ],
    [],
  );

  const returnReasons: ReadonlyArray<ReturnReasonDatum> = useMemo(
    () => [
      { name: "Wrong Size", value: 45 },
      { name: "Defective", value: 25 },
      { name: "Changed Mind", value: 20 },
      { name: "Other", value: 10 },
    ],
    [],
  );

  const monthlyCosts: ReadonlyArray<MonthlyCostPoint> = useMemo(
    () => [
      { month: "Week 1", costEur: 18250 },
      { month: "Week 2", costEur: 15980 },
      { month: "Week 3", costEur: 17140 },
      { month: "Week 4", costEur: 19260 },
    ],
    [],
  );

  const recentReturns: ReadonlyArray<RecentReturn> = useMemo(
    () => [
      {
        productName: "Comfort Sneakers (42)",
        customerId: "CUST-10492",
        returnReason: "Wrong Size",
        timestampIso: "2026-07-08T09:12:00.000Z",
      },
      {
        productName: "Wireless Headset Pro",
        customerId: "CUST-10371",
        returnReason: "Defective",
        timestampIso: "2026-07-08T08:40:00.000Z",
      },
      {
        productName: "Everyday Running Shorts",
        customerId: "CUST-10188",
        returnReason: "Changed Mind",
        timestampIso: "2026-07-08T07:58:00.000Z",
      },
      {
        productName: "Smartwatch Series 5",
        customerId: "CUST-10044",
        returnReason: "Other",
        timestampIso: "2026-07-07T18:21:00.000Z",
      },
      {
        productName: "Cotton T-Shirt (L)",
        customerId: "CUST-09917",
        returnReason: "Wrong Size",
        timestampIso: "2026-07-07T16:05:00.000Z",
      },
    ],
    [],
  );

  const returnReasonColors: Record<string, string> = useMemo(
    () => ({
      "Wrong Size": "#ef4444", // red-500
      Defective: "#f97316", // orange-500
      "Changed Mind": "#eab308", // yellow-500
      Other: "#6D28D9", // brand purple
    }),
    [],
  );

  return (
    <Box className="min-h-screen w-full bg-[#F5F7FA] px-4 py-6 md:px-6">
      <Stack spacing="4">
        {/* Header */}
        <Box className="grid grid-cols-3 items-center gap-4">
          <Box className="flex items-center">
            <Text type="h2" weight="semibold">
              Revolv
            </Text>
          </Box>

          <Box className="flex justify-center">
            <Box className="w-full max-w-md">
              <Input
                placeholder="Search returns, products, customers..."
                value={searchQuery}
                onChange={(value: string) => setSearchQuery(value)}
                leftIcon={<Search size={16} />}
                size="sm"
              />
            </Box>
          </Box>

          <Box className="flex justify-end">
            <Box className="flex items-center gap-3">
              <Avatar text="JD" shape="circle" />
              <Button
                icon={<Bell size={18} />}
                size="iconSm"
                variant="ghost"
                onClick={() => console.log("Open Notifications")}
              />
            </Box>
          </Box>
        </Box>

        {/* Page subtitle */}
        <Stack spacing="1">
          <Text type="h2" weight="semibold">
            Return Analytics
          </Text>
          <Text type="small" color="muted">
            Enterprise overview of return performance, reasons, and financial impact.
          </Text>
        </Stack>

        {/* Section 1: KPI Cards (4 columns) */}
        <Box className="grid grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card
              key={kpi.status}
              role="button"
              tabIndex={0}
              onClick={() => kpiConsoleNavigate()}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardHeader className="flex-row items-center gap-3">
                <Box className={`h-2.5 w-2.5 rounded-full ${kpi.dotClassName}`} />
                <CardTitle>{kpi.title}</CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                <Stack spacing="1">
                  <Text type="large" weight="bold">
                    {kpi.metricText}
                  </Text>
                  <Text type="small" color={kpi.trendColor}>
                    {kpi.trendText}
                  </Text>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Section 2: Analytics Split */}
        <Box className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Return Reasons (%)</CardTitle>
              <Text type="small" color="muted">
                Share of primary return categories (mocked data).
              </Text>
            </CardHeader>

            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => {
                      const v = typeof value === "number" ? value : Number(value);
                      const n = typeof name === "string" ? name : String(name);
                      return [`${Number.isFinite(v) ? v : 0}%`, n];
                    }}
                  />
                  <Legend />
                  <Pie
                    data={returnReasons}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={120}
                    stroke="none"
                  >
                    {returnReasons.map((entry) => (
                      <Cell key={entry.name} fill={returnReasonColors[entry.name] ?? "#6D28D9"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Financial Impact</CardTitle>
              <Text type="small" color="muted">
                Cost of returns over the current month (EUR, mocked).
              </Text>
            </CardHeader>

            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyCosts}>
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value: number) =>
                      `€${Math.round(value).toLocaleString("de-DE")}`
                    }
                  />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const v = typeof value === "number" ? value : Number(value);
                      return `€${Number.isFinite(v) ? v.toLocaleString("de-DE") : "0"}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="costEur"
                    stroke="#6D28D9"
                    strokeWidth={3}
                    fill="#6D28D9"
                    fillOpacity={0.18}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <Box className="mt-4">
                <Separator />
                <Box className="pt-3">
                  <Stack spacing="1">
                    <Text type="small" color="muted">
                      Brand accent: purple-700
                    </Text>
                    <Text type="large" weight="semibold">
                      Total:{" "}
                      {monthlyCosts.reduce((sum, p) => sum + p.costEur, 0).toLocaleString("de-DE")}{" "}
                      €
                    </Text>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Section 3: Recent Returns Live Feed */}
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Recent Returns</CardTitle>
            <Text type="small" color="muted">
              Latest mocked return events (top 5).
            </Text>
          </CardHeader>

          <CardContent>
            <Box className="grid grid-cols-4 gap-4 px-1 pb-2">
              <Text type="small" color="muted">
                Product
              </Text>
              <Text type="small" color="muted">
                Customer
              </Text>
              <Text type="small" color="muted">
                Reason
              </Text>
              <Text type="small" color="muted">
                Timestamp
              </Text>
            </Box>

            <Separator />

            <Stack spacing="0" isWrap={false}>
              {recentReturns.map((item, idx) => (
                <Box key={`${item.customerId}-${item.timestampIso}`} className="pt-3">
                  <Box className="grid grid-cols-4 gap-4 items-center">
                    <Text type="small" weight="semibold" breakWord={true}>
                      {item.productName}
                    </Text>
                    <Text type="small" color="muted" breakWord={true}>
                      {item.customerId}
                    </Text>
                    <Text type="small" color="default">
                      {item.returnReason}
                    </Text>
                    <Text type="small" color="muted" breakWord={true}>
                      {formatTimestamp(item.timestampIso)}
                    </Text>
                  </Box>

                  {idx < recentReturns.length - 1 && (
                    <Box className="mt-3">
                      <Separator />
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
