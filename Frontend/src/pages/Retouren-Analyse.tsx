import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import TopNavigationBar from "../components/TopNavigationBar";
import QualityReviewModal from "../components/QualityReviewModal";

// Definiert die verarbeitbaren Zustände einer KI-Optimierung für einen Artikel
type AIStatus = "ausstehend" | "in_bearbeitung" | "optimiert";

// Datenstruktur für einen einzelnen Eintrag in der Retourenanalyse
interface ReturnItem {
  id: string;
  articleNo: string;
  name: string;
  category: string;
  size: string;
  color: string;
  returnRate: number;
  reason: string;
  aiStatus: AIStatus;
}

// Zentrale Sidebar-Navigation für das Dashboard-Layout
const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Retourenanalyse", path: "/retouren-analyse" },
  { label: "Qualitätsprüfung", path: "/qualitaetspruefung" },
  { label: "Produktbeschreibung", path: "/produktbeschreibung" },
  { label: "Ki-Empfehlungen", path: "/ki-empfehlungen" },
];

// Statische Mock-Daten zur Simulation der API-Antwort
const MOCK_DATA: ReturnItem[] = [
  {
    id: "1",
    articleNo: "ART-44230",
    name: "Hose Blau",
    category: "Hosen",
    size: "XS",
    color: "Hellblau",
    returnRate: 42.7,
    reason: "Größe",
    aiStatus: "ausstehend",
  },
  {
    id: "2",
    articleNo: "ART-10482",
    name: "Hose Schwarz",
    category: "Hosen",
    size: "M",
    color: "Schwarz",
    returnRate: 38.4,
    reason: "Größe",
    aiStatus: "ausstehend",
  },
  {
    id: "3",
    articleNo: "ART-20871",
    name: "Weiße Jacke",
    category: "Jacken",
    size: "L",
    color: "Weiß",
    returnRate: 29.1,
    reason: "Qualität",
    aiStatus: "in_bearbeitung",
  },
  {
    id: "4",
    articleNo: "ART-55891",
    name: "Creme Bluse",
    category: "Blusen",
    size: "M",
    color: "Creme",
    returnRate: 19.3,
    reason: "Material",
    aiStatus: "in_bearbeitung",
  },
  {
    id: "5",
    articleNo: "ART-33104",
    name: "Blauer Rollkragenpullover",
    category: "Pullover",
    size: "S",
    color: "Navyblau",
    returnRate: 11.2,
    reason: "Farbe",
    aiStatus: "optimiert",
  },
  {
    id: "6",
    articleNo: "ART-66340",
    name: "Grüner Pullover",
    category: "Pullover",
    size: "L",
    color: "Grün",
    returnRate: 8.6,
    reason: "Sonstiges",
    aiStatus: "optimiert",
  },
];

// Schwellenwerte: >= 30% (Hoch/Rot), >= 20% (Kritisch/Gelb), < 20% (Normal/Grün).
function rateClasses(rate: number) {
  if (rate >= 30) return { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700" };
  if (rate >= 20) return { bg: "bg-yellow-50", dot: "bg-yellow-400", text: "text-yellow-700" };
  return { bg: "bg-green-50", dot: "bg-green-400", text: "text-green-700" };
}

export default function RetourenAnalyseView() {
  const navigate = useNavigate();
  const location = useLocation();

  // State für die Textsuche (Filterung) und die Sortierreihenfolge (desc = absteigend)
  const [query, setQuery] = useState("");
  const [desc, setDesc] = useState(true);

  // Modal-Status: welcher Artikel ist ausgewählt, ob das Modal geöffnet ist
  const [selectedItem, setSelectedItem] = useState<ReturnItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Platzhalter für den Fortschritt der Prüfschritte
  const [reviewedCount, setReviewedCount] = useState(0);

  // Filtert und sortiert die Artikeldaten.
  // useMemo verhindert unnötige Neuberechnungen
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Filtern nach Name, Artikelnummer oder Kategorie
    const filtered = MOCK_DATA.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.articleNo.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );

    // 2. Sortieren nach Retourenquote (Standard: Absteigend, um kritische Artikel oben zu zeigen)
    return filtered.sort((a, b) =>
      desc ? b.returnRate - a.returnRate : a.returnRate - b.returnRate,
    );
  }, [query, desc]);

  return (
    <Box className="min-h-screen bg-slate-50">
      {/* Header mit dynamischer Anzeige der gefilterten Artikelanzahl */}
      <TopNavigationBar />
     

      <Box className="flex">
        {/* Linke Seitenleiste für die Navigation innerhalb der Revolve-Anwendung */}
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

        {/* Hauptinhalt: Suchleiste, Sortierung und die tabellarische Übersicht */}
        <Box className="flex-1 p-6">
          {/* Steuerungselemente über der Tabelle */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <input
                aria-label="Suche Artikel"
                placeholder="Filter: Name, Artikel-Nr., Kategorie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-md border border-gray-200 px-3 py-2 w-72 focus:ring-2 focus:ring-blue-200"
              />
              <Button
                label={`Sort: ${desc ? "Absteigend" : "Aufsteigend"}`}
                onClick={() => setDesc((s) => !s)}
              />
            </div>
            <Button label="Filter..." variant="secondary" />
          </div>

          {/* Card-Container für die Datentabelle */}
          <Card>
            <CardHeader>
              <CardTitle>Artikelübersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Artikel-Nr.
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Produktname
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Kategorie
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Größe
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Farbe
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Retourenquote
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Häufigster Grund
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        KI-Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {visible.map((row) => {
                      const rc = rateClasses(row.returnRate);
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedItem(row);
                            setIsModalOpen(true);
                          }}
                        >
                          <td className="px-4 py-4 text-sm text-gray-400">{row.articleNo}</td>
                          <td className="px-4 py-4 font-semibold">{row.name}</td>
                          <td className="px-4 py-4 text-sm">{row.category}</td>
                          <td className="px-4 py-4 text-sm">{row.size}</td>
                          <td className="px-4 py-4 text-sm">{row.color}</td>
                          {/* Visualisierung der Retourenquote mit farbigem Statuspunkt */}
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${rc.bg}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${rc.dot}`} />
                              <span className={`font-semibold ${rc.text}`}>
                                {row.returnRate.toFixed(1)}%
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm">{row.reason}</td>
                          <td className="px-4 py-4 text-sm">{row.aiStatus}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Modal für die Detail-Qualitätsprüfung */}
      <QualityReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        reviewedCount={reviewedCount}
        totalCount={2}
      />
    </Box>
  );
}