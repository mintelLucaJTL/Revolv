namespace RevolvAPI.DTOs
{
    public class ArticleTableDTO
    {
        public int? id { get; set; }
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public decimal ReturnRate { get; set; }
        public string? AiStatus { get; set; }
        public string? MostFrequentReason { get; set; }
        public bool HasQualityBadge { get; set; }
        public bool HasDescriptionBadge { get; set; }
        public bool HasRecommendationBadge { get; set; }

        // True, wenn es mindestens eine Handlungsempfehlung gibt UND alle als erledigt markiert
        // sind - unabhängig vom (nur beschreibungs-getriebenen) AiStatus, damit "alle Maßnahmen
        // ergriffen" auch dann sichtbar ist, wenn der Beschreibungsvorschlag noch offen/abgelehnt ist.
        public bool AllActionsCompleted { get; set; }

        // True nur, wenn ALLE drei Bereiche (Qualität, KI-Beschreibung, Empfehlungen) fertig
        // bearbeitet sind - Grundlage für den Offen/Abgeschlossen-Status in der Tabelle. Anders als
        // AiStatus (rein beschreibungs-getrieben) berücksichtigt das wirklich alle drei Bereiche.
        public bool IsFullyResolved { get; set; }
    }
}
