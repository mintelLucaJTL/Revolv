import { Box, Button, Text } from "@jtl-software/platform-ui-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Retourenanalyse", path: "/retouren-analyse" },
  { label: "Ki-Empfehlungen", path: "/ki-empfehlungen" },
  { label: "Einstellungen", path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
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
  );
}
