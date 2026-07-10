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
const navItems = ["Dashboard","Retourenanalyse","Qualitätsprüfung","Produktbeschreibung","Ki-Empfehlungen"];
const Cardsnav = [
  {
    title: "Gesamte Retourenanalyse",
    content: "Details about the returns analysis."
  },
  {
    title: "Bertroffene Produkte",
    content: "Details about the returned products."
  },
  {
    title: "Ki Empfehlungen",
    content: "Details about the AI recommendations."
  },
  {
    title: "verbesserte Produkte",
    content: "Details about the AI recommendations."
  }
];
export default function Dashboard() {
  return (
    <Box className="min-h-screen bg-slate-50">
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
      <Box className="flex">
        <Box className="w-72 min-h-[calc(100vh-72px)]bg-white border-r p-4 space-y-3">
          <Text weight="bold"> Navigation</Text>
          {navItems.map((label) => (
            <Button key={label} label={label} variant="ghost" fullWidth />
          ))}
        </Box>
        <Box className="flex-1 p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </Box>
      </Box>
    </Box>
  );
}