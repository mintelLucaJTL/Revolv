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

const DISMISSED_STORAGE_KEY = "revolv.dismissedNotifications";

function loadDismissed(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

// Keine eigene Notifications-Tabelle/Read-Unread-Tracking - GET /api/notifications berechnet
// jeden Hinweis live aus vorhandenen Daten (offene KI-Empfehlungen, rote Artikel, bald
// ablaufende Team-Einladungen). Alle 5 Minuten neu geladen, das reicht für Hinweise, die sich
// nicht sekündlich ändern. Angeklickte Hinweise werden lokal (je Typ+Anzahl) als erledigt
// gemerkt, damit sie nach dem Klick aus der Glocke verschwinden - taucht später ein neuer
// Hinweis desselben Typs mit anderer Anzahl auf, wird er wieder angezeigt.
export default function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => loadDismissed());
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

  const visibleItems = items.filter((item) => dismissed[item.type] !== item.count);
  const totalCount = visibleItems.reduce((sum, item) => sum + item.count, 0);

  const dismiss = (item: NotificationItem) => {
    setDismissed((prev) => {
      const next = { ...prev, [item.type]: item.count };
      try {
        localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage nicht verfügbar (z.B. privater Modus) - Dismiss gilt dann nur für die Session
      }
      return next;
    });
  };

  const menuItems =
    visibleItems.length > 0
      ? visibleItems.map((item) => ({
          type: DropdownItem.Default,
          label: item.message,
          onClick: () => {
            dismiss(item);
            navigate(item.link);
          },
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
