

import {
  Card,
  CardContent,
  CardHeader,
  Text,
  Box,
  Button,
} from "@jtl-software/platform-ui-react";

interface Props {
  // Titel der Warnkarte, z. B. "Starkes Einlaufen"
  title: string;
  // Beschreibung des Problems
  description: string;
  // Callback, wenn der Nutzer den Punkt als geprüft markiert
  onChecked: () => void;
  // Callback, wenn der Nutzer ein Ticket erstellen möchte
  onCreateTicket: () => void;
}

export default function QualityWarningCard({
  title,
  description,
  onChecked,
  onCreateTicket,
}: Props) {
  return (
    // Die Karte hat einen roten Rahmen und ein hellrotes Hintergrund-Highlight
    <Card className="border border-red-100 bg-red-50 rounded-2xl shadow-sm">
      <CardHeader className="p-4">
        <Box className="flex items-center gap-3">
          {/* Icon-Kreis für den Warnhinweis */}
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <span className="text-red-600 font-bold">!</span>
          </div>

          {/* Titel der Warnkarte */}
          <div>
            <Text weight="bold">{title}</Text>
          </div>
        </Box>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Beschreibungstext des Problems */}
        <Box className="mb-4">
          <Text>{description}</Text>
        </Box>

        {/* Aktionsbuttons für diese Warnkarte */}
        <Box className="flex flex-wrap gap-3">
          <Button label="Überprüft" variant="secondary" onClick={onChecked} />
          <Button label="Ticket anlegen" variant="ghost" onClick={onCreateTicket} />
        </Box>
      </CardContent>
    </Card>
  );
}