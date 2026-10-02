namespace WildfireApi.Models
{
    public class FireData
    {
        // Represents the core wildfire data payload sent from the frontend client.
        public int Id { get; set; }
        public FireAttributes Attributes { get; set; }
        public FireGeometry Geometry { get; set; }
    }

    public class FireAttributes
    {
        public int OBJECTID { get; set; }
        public string FIRE_NAME { get; set; }
    }

    public class FireGeometry
    {
        public double X { get; set; }
        public double Y { get; set; }
    }
}