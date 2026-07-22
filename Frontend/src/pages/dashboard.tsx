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
            {Cardsnav.map((card) => {
              const extraText = card.extra ?? "";
              const isNegative =
                extraText.trim().startsWith("-") || extraText.trim().startsWith("−");

              return (
                <Card
                  key={card.title}
                  className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Icon-Kreis */}
                        <div className="rounded-lg p-2 bg-slate-100 flex items-center justify-center">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-slate-600"
                            aria-hidden
                          >
                            <path d="M7 14l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>

                        {/* Textbereich: Wert + kurze Beschreibung */}
                        <div>
                          <div className="text-3xl font-bold leading-tight">{card.value}</div>
                          <div className="text-sm text-slate-600 mt-1">{card.content}</div>
                        </div>
                      </div>

                      {/* Rechts oben: kleines Pill-Badge für die Extra-Info */}
                      {card.extra && (
                        <div
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isNegative
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {card.extra}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
