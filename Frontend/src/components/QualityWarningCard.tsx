import { Card, CardContent, CardHeader, Text, Box, Button } from "@jtl-software/platform-ui-react";

interface Props {
  // Title of the warning card, e.g. "Strong shrinkage"
  title: string;
  // Description of the problem
  description: string;
  // Whether this issue has already been marked as reviewed (persisted in the backend)
  isChecked: boolean;
  // Called when the user toggles the reviewed state
  onToggleChecked: () => void;
  // Called when the user wants to create a ticket
  onCreateTicket: () => void;
}

export default function QualityWarningCard({
  title,
  description,
  isChecked,
  onToggleChecked,
  onCreateTicket,
}: Props) {
  return (
    // Red border/background highlight while unreviewed, neutral gray once reviewed.
    <Card
      className={
        isChecked
          ? "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 rounded-2xl shadow-sm"
          : "border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 rounded-2xl shadow-sm"
      }
    >
      <CardHeader className="p-4">
        <Box className="flex items-center gap-3">
          {/* Icon circle for the warning */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isChecked
                ? "bg-slate-200 dark:bg-slate-800"
                : "bg-red-100 dark:bg-red-900/50"
            }`}
          >
            <span
              className={
                isChecked
                  ? "text-slate-600 dark:text-slate-300 font-bold"
                  : "text-red-600 dark:text-red-400 font-bold"
              }
            >
              {isChecked ? "✓" : "!"}
            </span>
          </div>

          {/* Title of the warning card */}
          <div>
            <Text weight="bold">{title}</Text>
          </div>
        </Box>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Description text of the issue */}
        <Box className="mb-4">
          <Text>{description}</Text>
        </Box>

        {/* Action buttons for this warning card */}
        <Box className="flex flex-wrap gap-3">
          <Button
            label={isChecked ? "Überprüft ✓" : "Überprüft"}
            variant={isChecked ? "ghost" : "secondary"}
            onClick={onToggleChecked}
          />
          <Button label="Ticket anlegen" variant="ghost" onClick={onCreateTicket} />
        </Box>
      </CardContent>
    </Card>
  );
}