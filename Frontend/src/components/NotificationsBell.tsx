import { Button, DropdownItem, JTLDropdown } from "@jtl-software/platform-ui-react";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

interface NotificationItem {
  type: string;
  message: string;
  count: number;
  link: string;
}

// Keine eigene Notifications-Tabelle/Read-Unread-Tracking - GET /api/notifications berechnet
// jeden Hinweis live aus vorhandenen Daten (offene KI-Empfehlungen, rote Artikel, bald
// ablaufende Team-Einladungen). Alle 5 Minuten neu geladen, das reicht für Hinweise, die sich
// nicht sekündlich ändern.
export default function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const response = await apiFetch("/api/notifications");
      if (!response.ok) return;
      const data = (await response.json()) as NotificationItem[];
      setItems(data);
    } catch (err) {
      console.error("Fehler beim Laden der Benachrichtigungen:", err);
    }
  };

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  const menuItems =
    items.length > 0
      ? items.map((item) => ({
          type: DropdownItem.Default,
          label: item.message,
          onClick: () => navigate(item.link),
        }))
      : [
          {
            type: DropdownItem.Default,
            label: "Keine neuen Benachrichtigungen",
          },
        ];

  return (
    <JTLDropdown position="right" width="280px" menuItems={menuItems}>
      <Button
        variant="secondary"
        size="icon"
        icon={<Bell size={20} />}
        badgeNum={totalCount > 0 ? totalCount : undefined}
        aria-label={totalCount > 0 ? `${totalCount} Benachrichtigungen` : "Benachrichtigungen"}
      />
    </JTLDropdown>
  );
}
