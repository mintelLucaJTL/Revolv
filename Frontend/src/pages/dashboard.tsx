import {
  AppHeader,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
} from "@jtl-software/platform-ui-react";
import KpiCard from "../components/KpiCard";
import { useNavigate, useLocation } from "react-router-dom";
import TopNavigationBar from "../components/TopNavigationBar";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Retourenanalyse", path: "/retouren-analyse" },
  { label: "Qualitätsprüfung", path: "/qualitaetspruefung" },
  { label: "Produktbeschreibung", path: "/produktbeschreibung" },
  { label: "Ki-Empfehlungen", path: "/ki-empfehlungen" },
];

const Cardsnav = [
  {
    title: "Gesamte Retourenquote",
    content: "Gesamtquote aller Retouren in diesem Monat.",
    value: "24,8%",
    extra: "−2,3% gegenüber letzter Woche",
  },
  {
    title: "Betroffene Artikel",
    content: "Artikel mit aktuellen Rücksendungen.",
    value: "142",
    extra: "+8 gegenüber gestern",
  },
  {
    title: "KI-Empfehlungen offen",
    content: "Offene Vorschläge, die noch geprüft werden müssen.",
    value: "37",
    extra: "−5 diese Woche",
  },
  {
    title: "Verbesserte Produkte",
    content: "Produkte, die bereits verbessert wurden.",
    value: "89",
    extra: "+12 in diesem Monat",
  },
];

// vordefinierte Schwellenwerte für die KpiCards (Ampel-Logik)
const tilesData = [
  {
    variant: "red",
    badgeLabel: "ÜBER 25%",
    smallLabel: "Hohe Retourenquote",
    value: 3,
    percent: "36.7%",
  }, //fürs ampel prinzip (KpiCard)
  {
    variant: "yellow",
    badgeLabel: "10 – 25%",
    smallLabel: "Mittlere Retourenquote",
    value: 2,
    percent: "15.3%",
  },
  {
    variant: "green",
    badgeLabel: "UNTER 10%",
    smallLabel: "Niedrige Retourenquote",
    value: 1,
    percent: "8.6%",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box className="min-h-screen bg-slate-50">
      <TopNavigationBar />
      {/* Globale Kopfzeile der App mit Titel und primären Aktionen */}
      <AppHeader
        title="Revolve Dashboard"
        subtitle="Welcome back!"
        actions={
          <Box className="flex items-center gap-3">
            <Button label="Alerts" variant="secondary" />
          </Box>
        }
        className="bg-white shadow-sm"
      />

      {/* Haupt-Layout-Splitter: Trennung zwischen Sidebar und Content */}
      <Box className="flex">
        {/* Linke Navigationsleiste (Sidebar) */}
        <Box className="w-72 min-h-[calc(100vh-72px)] bg-white border-r p-4 space-y-3">
          <Text weight="bold">Navigation</Text>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                label={item.label}
                variant={isActive ? "default" : "ghost"}
                fullWidth
                onClick={() => navigate(item.path)}
                aria-current={isActive ? "page" : undefined}
              />
            );
          })}
        </Box>

        {/* Rechter Hauptinhaltsbereich  */}
        <Box className="flex-1 p-6">
          <Text weight="bold">Retourenanalyse</Text>

          {/*
            Zweiter Content-Bereich:
            Raster-Layout für die allgemeinen Informations- und Analyse-Karten.
          */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 mt-4">
            {Cardsnav.map((card) => (
              <Card key={card.title} className="p-2">
                <CardHeader className="pb-1">
                  <CardTitle>{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <Box className="text-2xl font-bold">{card.value}</Box>
                  <Text>{card.content}</Text>
                  <Box className="text-sm text-slate-500">{card.extra}</Box>
                </CardContent>
              </Card>
            ))}
          </div>

          {/*
            KPI-Bereich (Ampelkacheln):
          */}
          <div className="grid gap-4 mt-6">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {tilesData.map((t) => (
                <KpiCard
                  key={t.smallLabel}
                  variant={t.variant as any} // Typ-Cast, da Variante strikt "red"|"green"|"yellow" erwartet
                  badgeLabel={t.badgeLabel}
                  smallLabel={t.smallLabel}
                  value={t.value}
                  percent={t.percent}
                  onClick={() => {}}
                />
              ))}
            </div>

            <div className="w-full max-w-3xl mx-auto">
              <ReturnReasonsChart />
            </div>
          </div>
        </Box>
      </Box>
    </Box>
  );
}
