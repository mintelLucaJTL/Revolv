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
        <Box className="w-72 min-h-[calc(100vh-72px)] bg-white border-r p-4 space-y-3">
          <Text weight="bold">Navigation</Text>
          <Button label="Dashboard" variant="ghost" fullWidth />
          <Button label="Orders" variant="ghost" fullWidth />
          <Button label="Products" variant="ghost" fullWidth />
        </Box>

        <Box className="flex-1 p-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Latest Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>Recent order details go here.</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revolve Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>Current client info and progress.</Text>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}