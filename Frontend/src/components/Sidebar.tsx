import { Box, Button, Text } from "@jtl-software/platform-ui-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Retourenanalyse", path: "/retouren-analyse" },
  { label: "Aktionsplan", path: "/aktionsplan" },
  { label: "Erfolgsmessung", path: "/erfolgsmessung" },
];

const adminNavItems = [{ label: "Mein Team", path: "/team" }];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const items = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <Box className="w-72 shrink-0 h-full overflow-y-auto bg-white border-r border-slate-200 p-4 space-y-3 dark:bg-slate-900 dark:border-slate-700">
      <Box className="dark:text-slate-100">
        <Text weight="bold">Navigation</Text>
      </Box>

      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Button
            key={item.path}
            label={item.label}
            variant={isActive ? "highlight" : "ghost"}
            fullWidth
            onClick={() => navigate(item.path)}
            aria-current={isActive ? "page" : undefined}
          />
        );
      })}
    </Box>
  );
}
