import {
  Avatar,
  Box,
  Button,
  DropdownItem,
  Input,
  JTLDropdown,
  Text,
} from "@jtl-software/platform-ui-react";

import { Bell, Search, Settings, LogOut, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TopNavigationBar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* 1. Logo */}
      <Box className="flex items-center gap-2 w-64">
        <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <Text weight="bold">Revolv</Text>
      </Box>

      {/* 2. Search */}
      <Box className="flex-1 flex justify-center px-4">
        <div className="w-full max-w-lg">
          <Input type="text" placeholder="Search..." leftIcon={<Search size={18} />} />
        </div>
      </Box>

      {/* 3. Notifications + Profile */}
      <Box className="flex items-center justify-end gap-4 w-64">
        <Button
          variant="secondary"
          size="icon"
          icon={<Bell size={20} />}
          badgeNum={1}
          aria-label="Notifications"
        />

        {/* Profile dropdown */}
        <JTLDropdown
          position="right"
          width="192px"
          menuItems={[
            {
              type: DropdownItem.Default,
              label: "Edit profile",
              icon: <Edit size={16} />,
              onClick: () => navigate("/profile"),
            },
            {
              type: DropdownItem.Default,
              label: "Settings",
              icon: <Settings size={16} />,
              onClick: () => navigate("/settings"),
            },
            { type: DropdownItem.Separator },
            {
              type: DropdownItem.Danger,
              label: "Logout",
              icon: <LogOut size={16} />,
              onClick: logout,
            },
          ]}
        >
          {/* Profile button */}
          <Button
            variant="secondary"
            icon={<Avatar text="MM" shape="circle" />}
            label="Max Mustermann"
            aria-label="Profile menu"
          />
        </JTLDropdown>
      </Box>
    </header>
  );
}
