import {
  Avatar,
  Box,
  Button,
  DropdownItem,
  JTLDropdown,
  Text,
} from "@jtl-software/platform-ui-react";

import { Settings, LogOut, Edit } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SetNameModal from "./SetNameModal";
import NotificationsBell from "./NotificationsBell";
import { fetchCurrentUser, getInitials, updateCurrentUserName } from "../utils/user";
import { useAuth } from "../context/AuthContext";

export default function TopNavigationBar() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const { logout: authLogout, isAdmin } = useAuth();

  useEffect(() => {
    let isMounted = true;

    fetchCurrentUser()
      .then((user) => {
        if (!isMounted) return;
        if (user.name && user.name.trim()) {
          setDisplayName(user.name.trim());
          setNeedsName(false);
        } else {
          // Existing user from before the "Name" field existed - ask them to set one.
          setDisplayName(user.email);
          setNeedsName(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load current user:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNameSaved = async (name: string) => {
    const updated = await updateCurrentUserName(name);
    setDisplayName(updated.name ?? name);
    setNeedsName(false);
  };

  const logout = () => {
    void authLogout().finally(() => navigate("/login"));
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-50 dark:bg-slate-900 dark:border-slate-700">
      {/* 1. Logo */}
      <Box className="flex items-center gap-2 w-64">
        <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <Box className="dark:text-slate-100">
          <Text weight="bold">Revolv</Text>
        </Box>
      </Box>

      {/* 2. Notifications + Profile */}
      <Box className="flex items-center justify-end gap-4 w-64">
        <NotificationsBell />

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
            ...(isAdmin
              ? [
                  {
                    type: DropdownItem.Default,
                    label: "Settings",
                    icon: <Settings size={16} />,
                    onClick: () => navigate("/settings"),
                  },
                ]
              : []),
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
            icon={<Avatar text={getInitials(displayName)} shape="circle" />}
            label={displayName ?? "…"}
            aria-label="Profile menu"
          />
        </JTLDropdown>
      </Box>

      <SetNameModal isOpen={needsName} onSaved={handleNameSaved} />
    </header>
  );
}
