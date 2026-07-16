// Importiert die benötigten UI-Komponenten aus der JTL-Designbibliothek
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Box,
  Text,
} from "@jtl-software/platform-ui-react";
// Recharts-Bibliothek für die responsive Datenvisualisierung
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Definiert die Struktur der Datenpunkte für die Retourenursachen
interface ReturnReason {
  id: string;
  reasonName: string;
  count: number; // Der Prozentwert für das jeweilige Segment
  colorCode: string; // Der spezifische Hex-Farbcode zur Unterscheidung
}

// Statische Daten zur Auswertung der Rücksendegründe.
// Die Farbwerte nutzen abgestufte Blautöne für ein sauberes Gesamtbild.
const DATA: ReturnReason[] = [
  { id: "1", reasonName: "Passform", count: 41, colorCode: "#00287d" },
  { id: "2", reasonName: "Qualität", count: 28, colorCode: "#1d59a3" },
  { id: "3", reasonName: "Farbe", count: 16, colorCode: "#235289" },
  { id: "4", reasonName: "Material", count: 10, colorCode: "#3776c3" },
  { id: "5", reasonName: "Sonstiges", count: 5, colorCode: "#2aabfc" },
];

// Visualisiert die häufigsten Retourengründe als modernes Donut-Diagramm
export default function ReturnReasonsChart() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Häufigste Retourengründe</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <Box className="text-sm text-slate-500">
          Gesamtverteilung aller Rücksendungen
        </Box>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              // Durch das Zusammenspiel von innerRadius und outerRadius erzeugen wir den Donut-Look
              <Pie
                data={DATA}
                dataKey="count"
                nameKey="reasonName"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4} // Kleiner Abstand zwischen den Segmenten für eine filigranere Optik
                cornerRadius={8} // Rundet die Ecken der einzelnen Segmente ab
              >
               
                {DATA.map((entry) => (
                  <Cell key={entry.id} fill={entry.colorCode} />
                ))}
              </Pie>

             
              <Tooltip
                formatter={(value) => [`${value ?? 0}%`, "Anteil"]}
                contentStyle={{ borderRadius: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {DATA.map((item) => (
            <Box
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"
            >
              
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.colorCode }}
              />
              <Text>{item.reasonName}</Text>
            </Box>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}