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

// Statische Menüpunkte für die linke Hauptnavigation
const navItems = ["Dashboard", "Retourenanalyse", "Qualitätsprüfung", "Produktbeschreibung", "Ki-Empfehlungen"];

// Inhalte für die Grid-Karten im unteren Bereich des Dashboards
const Cardsnav = [
  { title: "Gesamte Retourenanalyse", content: "Zusammenfassung der Retourenanalyse." },
  { title: "Betroffene Produkte",      content: "wie viel produkte betroffen sind." },
  { title: "Ki Empfehlungen",         content: "was die ki vorschlägt." },
  { title: "Verbesserte Produkte",     content: "Zusammenfassung der verbesserten Produkte." }
];

// vordefinierte Schwellenwerte für die KpiCards (Ampel-Logik)
const tilesData = [
  { variant: "red",    badgeLabel: "ÜBER 25%",  smallLabel: "Hohe Retourenquote",    value: 3, percent: "36.7%" },
  { variant: "yellow", badgeLabel: "10 – 25%",  smallLabel: "Mittlere Retourenquote", value: 2, percent: "15.3%" },
  { variant: "green",  badgeLabel: "UNTER 10%", smallLabel: "Niedrige Retourenquote", value: 1, percent: "8.6%" }
];

export default function Dashboard() {
  return (
    <Box className="min-h-screen bg-slate-50">
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
         
          {navItems.map((label) => (
            <Button key={label} label={label} variant="ghost" fullWidth />
          ))}
        </Box>

        {/* Rechter Hauptinhaltsbereich  */}
        <Box className="flex-1 p-6">
          <Text weight="bold">Retourenanalyse</Text>

          {/* 
            KPI-Bereich (Ampelkacheln): 
          */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 my-2">
            {tilesData.map(t => (
              <KpiCard
                key={t.smallLabel}
                variant={t.variant as any} // Typ-Cast, da Variante strikt "red"|"green"|"yellow" erwartet
                badgeLabel={t.badgeLabel}
                smallLabel={t.smallLabel}
                value={t.value}
                percent={t.percent}
                onClick={() => { 
                  // TODO: Hier später die Filter-Logik für die Tabellen-Auswahl einbinden
                }} 
              />
            ))}
          </div>

          {/* 
            Zweiter Content-Bereich:
            Raster-Layout für die allgemeinen Informations- und Analyse-Karten.
          */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {Cardsnav.map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardTitle>{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text>{card.content}</Text>
                </CardContent>
              </Card>
            ))}
          </div>

        </Box>
      </Box>
    </Box>
  );
}