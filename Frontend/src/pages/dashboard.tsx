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
import TopNavigationBar from "../components/TopNavigationBar";
import ReturnReasonsChart from "../components/ReturnReasonsChar";
import Sidebar from "../components/Sidebar";

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
  return (
    <Box className="min-h-screen bg-slate-50">
      <TopNavigationBar />
      {/* Globale Kopfzeile der App mit Titel und primären Aktionen */}
      
      {/* Haupt-Layout-Splitter: Trennung zwischen Sidebar und Content */}
      <Box className="flex">
        <Sidebar />

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
