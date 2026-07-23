namespace RevolvAPI.DTOs
{
    // Pre-computed traffic-light KPIs for the dashboard. Each colour band holds the
    // number of matching AI recommendations and their average return rate, so the
    // client does not have to load and aggregate the raw articles itself.
    public class TrafficLightKpiDto
    {
        public TrafficLightGroupDto Red { get; set; } = new();
        public TrafficLightGroupDto Yellow { get; set; } = new();
        public TrafficLightGroupDto Green { get; set; } = new();

        /// <summary>Yellow band starts here (from ShopSettings). Green is below.</summary>
        public decimal YellowThreshold { get; set; }

        /// <summary>Red band starts above this (from ShopSettings). Yellow is up to here.</summary>
        public decimal RedThreshold { get; set; }
    }

    // Aggregated values for a single traffic-light band.
    public class TrafficLightGroupDto
    {
        public int Count { get; set; }
        public decimal AveragePercent { get; set; }
    }
}
