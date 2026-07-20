

import { Card, CardContent, CardHeader, CardTitle, Button, Text, Box } from "@jtl-software/platform-ui-react";
import QualityWarningCard from "./QualityWarningCard";

// Typ für den ausgewählten Artikel in der Qualitätsprüfung
export interface ReturnItem {
  id: string;
  articleNo: string;
  name: string;
  category: string;
  size: string;
  color: string;
  returnRate: number;
  reason: string;
  aiStatus: string;
}

interface Props {
  isOpen: boolean;               // steuert, ob das Modal sichtbar ist
  onClose: () => void;           // Callback zum Schließen des Modals
  item: ReturnItem | null;       // aktuell ausgewählter Artikel
  reviewedCount: number;         // wie viele Prüfpunkte bereits bearbeitet sind
  totalCount: number;            // Gesamtanzahl der Prüfpunkte
}

export default function QualityReviewModal({ isOpen, onClose, item, reviewedCount, totalCount }: Props) {
  // Wenn das Modal geschlossen ist oder kein Artikel übergeben wurde, nichts rendern
  if (!isOpen || !item) return null;

  return (
    // Overlay hinter dem Modal, das den Hintergrund abdunkelt
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-[28px] shadow-2xl overflow-hidden">
        <Card className="rounded-none border-none shadow-none">
          <CardHeader className="px-6 py-5">
            <div className="flex flex-col gap-2">
              {/* Header-Bereich mit Titel, Beschreibung und Schließen-Button */}
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Qualitätsprüfung</CardTitle>
                  <Text>Prüfe den Artikel und vergleiche aktuellen Text mit KI-Vorschlag.</Text>
                </div>
                <Button label="Schliessen" variant="ghost" onClick={onClose} />
              </div>

              {/* Statusanzeige für die Bearbeitungsschritte */}
              <Box className="flex items-center gap-2 text-sm text-slate-500">
                <span>{reviewedCount} / {totalCount} bearbeitet</span>
              </Box>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Linke Seite: Qualitätsmängel und Warnkarten */}
              <div className="space-y-4">
                <Text weight="bold">Qualitätsprüfung</Text>
                <QualityWarningCard
                  title="Starkes Einlaufen"
                  description="Der Artikel scheint bei der Materialbeschreibung eine zu hohe Einlaufquote zu haben."
                  onChecked={() => {}}
                  onCreateTicket={() => {}}
                />
                <QualityWarningCard
                  title="Falsche Materialangabe"
                  description="Die aktuelle Beschreibung nennt ein anderes Material als der Artikel tatsächlich hat."
                  onChecked={() => {}}
                  onCreateTicket={() => {}}
                />
              </div>

              {/* Rechte Seite: Produktbeschreibung und A/B-Vergleich */}
              <div className="space-y-4">
                <Text weight="bold">Produktbeschreibung</Text>
                <Card className="border border-gray-100 bg-slate-50">
                  <CardContent className="p-4">
                    <Text weight="bold">Aktuell</Text>
                    <Box className="mt-2 mb-4">
                      <Text>Der Artikel ist eine leichte Sommerhose aus Polyester.</Text>
                    </Box>

                    <Text weight="bold">KI-VORSCHLAG</Text>
                    <Box className="mt-2">
                      <Text>Empfohlen: Beschreibe die Hose als atmungsaktiv und elastisch für warme Tage.</Text>
                    </Box>
                  </CardContent>
                </Card>

                {/* Split-View: aktueller Text vs. KI-Vorschlag */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Box className="text-xs uppercase text-slate-500">
                    <Text>Aktuell</Text>
                  </Box>
                  <Box className="mt-2">
                    <Text>Grauer Text mit aktuellem Zustand.</Text>
                  </Box>

                  <Box className="text-xs uppercase text-blue-500">
                    <Text>KI-Vorschlag</Text>
                  </Box>
                  <Box className="mt-2">
                    <Text>Blauer Text mit KI-optimierter Version.</Text>
                  </Box>
                </div>
              </div>
            </div>

            {/* Aktions-Buttons am unteren Rand des Modals */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button label="Ablehnen" variant="ghost" onClick={() => {}} />
              <Button label="Bearbeiten" variant="secondary" onClick={() => {}} />
              <Button label="Übernehmen" variant="highlight" onClick={() => {}} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}