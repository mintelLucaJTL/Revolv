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
const Cards = [
  {
    title: "Retourenanalyse",
    content: "Details about the returns analysis."
  },
  {
    title: "Qualitätsprüfung",
    content: "Details about the quality inspection."
  },
  {
    title: "Produktbeschreibung",
    content: "Details about the product description."
  },
  {
    title: "Ki-Empfehlungen",
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
    </Box>
  );
}