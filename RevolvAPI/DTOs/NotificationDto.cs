namespace RevolvAPI.DTOs
{
    public class NotificationDto
    {
        // Kurzer, stabiler Bezeichner für's Frontend (z.B. Icon-Auswahl) - kein DB-Wert.
        public string Type { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public int Count { get; set; }
        // Wohin ein Klick auf diese Benachrichtigung im Frontend navigieren soll.
        public string Link { get; set; } = string.Empty;
    }
}
