using CoordinateSharp;

namespace PGLaps
{
    public class PGTask
    {
        public int version { get; set; }
        public string taskType { get; set; }
        public string earthModel { get; set; }
        public SSS sss { get; set; }
        public Goal goal { get; set; }
        public List<Turnpoint> turnpoints { get; set; }

        public PGTask()
        {
            taskType = string.Empty;
            earthModel = string.Empty;
            sss = new SSS();
            goal = new Goal();
            turnpoints = new List<Turnpoint>();
        }
    }

    public class SSS
    {
        public string type { get; set; }
        public string direction { get; set; }
        public List<string> timeGates { get; set; }

        public SSS()
        {
            type = "SSS";
            direction = string.Empty;
            timeGates = new List<string>();
        }
    }

    public class Goal
    {
        public string type { get; set; }
        public string deadline { get; set; }
        public Goal()
        {
            type = string.Empty;
            deadline = string.Empty;
        }
    }

    public class Turnpoint
    {
        public int radius { get; set; }
        public Waypoint waypoint { get; set; }
        public string type { get; set; }
        public Turnpoint()
        {
            waypoint = new Waypoint();
        }
    }

    public class Waypoint
    {
        public string name { get; set; }
        public string description { get; set; }
        public double lat { get; set; }
        public double lon { get; set; }
        public int altSmoothed { get; set; }
        //public Coordinate coordinate { get; set; }
        public Waypoint()
        {
            name = string.Empty;
            description = string.Empty;
            //coordinate = new Coordinate();
        }
    }

    public class Airspace
    {
        public string Name { get; set; }
        public string Class { get; set; }
        public List<Coordinate> Coordinates { get; set; }
        public string Floor { get; set; }
        public string Ceiling { get; set; }

        public Airspace()
        {
            Name = string.Empty;
            Class = string.Empty;
            Coordinates = new List<Coordinate>();
            Floor = string.Empty;
            Ceiling = string.Empty;
        }
    }

    public class Leg
    {
        public Coordinate Start { get; private set; }
        public Coordinate End { get; private set; }
        public Distance Distance { get; set; }
        public double Bearing { get { return Distance.Bearing; } }
        public Leg(Coordinate coord1, Coordinate coord2)
        {
            this.Start = coord1;
            this.End = coord2;
            this.Distance = new Distance(coord1, coord2);
        }

        public Coordinate NextPoint(double metersDistance, double nextWPBearing)
        {
            //Based on a starting leg, distance and angle, calculate the next point Coordinates with the CoordinateSharp library
            var nextPoint = new Coordinate(End.Latitude.DecimalDegree, End.Longitude.DecimalDegree);
            nextPoint.Move(metersDistance, nextWPBearing, Shape.Ellipsoid);
            return nextPoint;
        }
    }

    public class Angle
    {
        public Leg LegA { get; private set; }
        public Leg LegB { get; private set; }
        public double DegreesInside { get; private set; }
        public double DegreesOutside { get { return 360 - DegreesInside; } }

        public double DegreeChange { get; private set; }
        public string TurnDirection { get; private set; }

        public Angle(Leg legA, Leg legB)
        {
            this.LegA = legA; //Incoming leg
            this.LegB = legB; //Outgoing leg
            this.DegreesInside = CalculateInsideAngle(LegA.Bearing, LegB.Bearing);
            this.DegreeChange = CalculateDegreeChange(LegA.Bearing, LegB.Bearing);
            this.TurnDirection = DegreeChange < 0 ? "left" : "right";
        }

        private double CalculateDegreeChange(double bearing1, double bearing2)
        {
            // Normalize bearings to be between 0 and 360 degrees
            bearing1 = NormalizeBearing(bearing1);
            bearing2 = NormalizeBearing(bearing2);

            // Calculate the difference between bearings
            double difference = bearing2 - bearing1;

            // Normalize the difference to be between -180 and 180 degrees
            if (difference > 180)
            {
                difference -= 360;
            }
            else if (difference < -180)
            {
                difference += 360;
            }

            return difference;
        }

        public static double CalculateInsideAngle(double bearing1, double bearing2)
        {
            // Normalize bearings to be between 0 and 360 degrees
            bearing1 = NormalizeBearing(bearing1 + 180); //Reverse bearing
            bearing2 = NormalizeBearing(bearing2);

            // Calculate the absolute difference between bearings
            double angleDifference = Math.Abs(bearing1 - bearing2);

            // Return the smaller angle (inside angle)
            return Math.Min(angleDifference, 360 - angleDifference);
        }

        public static double NormalizeBearing(double bearing)
        {
            // Ensure bearing is between 0 and 360 degrees
            return (bearing % 360 + 360) % 360;
        }


        public Coordinate GetWaypointCoordinate(double waypointRadius)
        {
            //Check that the legs are connected
            if (LegA.End != LegB.Start)
            {
                throw new System.Exception("Legs are not connected");
            }

            //Calculate the waypoint coordinate based on the angle between two legs
            var halfOutsideAngle = this.DegreesOutside / 2;
            var reverseLegABearing = NormalizeBearing(LegA.Bearing + 180);
            var bearing = NormalizeBearing(reverseLegABearing + (TurnDirection == "left" ? -1 : 1) * halfOutsideAngle); //Turn angle is negative for left turns
            var waypoint = LegA.NextPoint(waypointRadius, bearing);
            return waypoint;
        }
    }

    public class DistanceAngleWPRadius
    {
        public double Distance { get; set; }
        public double TurnAngle { get; set; }
        public double WaypointRadius { get; set; }

        public DistanceAngleWPRadius(double distance, double turnAngle, double wpRadiusInMeters)
        {
            Distance = distance;
            TurnAngle = turnAngle;
            WaypointRadius = wpRadiusInMeters;
        }
    }
}