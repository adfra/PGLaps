using CoordinateSharp;
using System.Text;

namespace PGLaps
{
    public class TaskBuilder
    {
        public Coordinate Start { get; set; }
        public bool CloseLoop { get; set; }
        private List<DistanceAngleWPRadius> listOfDistBearWPRadius;

        public TaskBuilder(Coordinate start, String csvOfDistancesAndAngleDegrees, bool closeLoop)
        {
            this.Start = start;
            this.CloseLoop = closeLoop;

            var distanceBearingParser = new DistanceBearingParser();
            listOfDistBearWPRadius = distanceBearingParser.Parse(csvOfDistancesAndAngleDegrees);
        }

        /// <summary>
        /// Takes a starting Coordinate, a CSV string of distances (m), angles and waypoint sizes(m), and a boolean to close the loop.
        /// </summary>
        /// <param name="start">Coordinate for the start</param>
        /// <param name="csvOfDistancesAndAngleDegrees"></param>
        /// <param name="closeLoop"></param>
        /// <returns></returns>
        public List<Coordinate> BuildOptimizedPointsList()
        {
            //Parse the CSV string into a list of legs
            

            //Create the waypoints
            var optimizedPoints = new List<Coordinate>();
            optimizedPoints.Add(Start);
            var lastWP = Start;

            for (int i = 0; i < listOfDistBearWPRadius.Count; i++)
            {
                double absBearing;

                if(i == 0)
                {
                    absBearing = listOfDistBearWPRadius[i].TurnAngle;
                }
                else
                {
                    var lastBearing = new Leg(optimizedPoints[i-1], optimizedPoints[i]).Bearing;
                    //absBearing = Angle.NormalizeBearing(lastBearing + listOfDistBearWPRadius[i].TurnAngle);
                    absBearing = lastBearing + listOfDistBearWPRadius[i].TurnAngle;
                    absBearing = Angle.NormalizeBearing(absBearing);
                }
                var nextWP = new Coordinate(optimizedPoints[i].Latitude.DecimalDegree, optimizedPoints[i].Longitude.DecimalDegree);
                nextWP.Move(listOfDistBearWPRadius[i].Distance, absBearing, Shape.Ellipsoid);
                
                optimizedPoints.Add(nextWP);
                lastWP = nextWP;
            }

            if (CloseLoop)
            {
                optimizedPoints.Add(Start);
                var closingLeg = new Leg(lastWP, Start);
                var distBearRadius = new DistanceAngleWPRadius(closingLeg.Distance.Meters, closingLeg.Bearing, 100); //TODO remove fixed WP size for goal.
                listOfDistBearWPRadius.Add(distBearRadius);
            }

            return optimizedPoints;
        }

        // Function that takes a list of coordinates and returns a list of legs
        public List<Leg> BuildLegList(List<Coordinate> coordinates)
        {
            var legs = new List<Leg>();
            for (int i = 0; i < coordinates.Count - 1; i++)
            {
                legs.Add(new Leg(coordinates[i], coordinates[i + 1]));
            }
            return legs;
        }

        //Function that takes a list of legs and turns it into a list of angles
        public List<Angle> BuildAngleList(List<Leg> legs)
        {
            var angles = new List<Angle>();
            for (int i = 0; i < legs.Count - 1; i++)
            {
                angles.Add(new Angle(legs[i], legs[i + 1]));
            }
            return angles;
        }

        //Function that calculates the Waypoint coordinates based on the angles between legs and the waypoint radius provided in listOfDistBearWPRadius
        public List<Turnpoint> BuildTurnpointList(List<Angle> angles)
        {
            var wptCoordinates = new List<Coordinate>();
            var turnpoints = new List<Turnpoint>();

            var tp = new Turnpoint();
            var wp = new Waypoint();

            int fixedTPRadius = 100; //TODO: FIXED VALUE, Should be flexible.

            //Add the start.
            tp.radius = fixedTPRadius; //TODO: FIXED VALUE, Should be flexible.
            tp.type = "SSS";

            wp.name = $"WP00";
            wp.description = wp.name;
            wp.altSmoothed = 0;
            //TODO: These coordinates need to be extended to cater for the start radius
            wp.lat = angles[0].LegA.Start.Latitude.DecimalDegree;
            wp.lon = angles[0].LegA.Start.Longitude.DecimalDegree;

            tp.waypoint = wp;
            turnpoints.Add(tp);

            //Add normal waypoints
            for (int i = 0; i < angles.Count; i++)
            {
                tp = new Turnpoint();
                wp = new Waypoint();

                tp.radius = (int)Math.Round(listOfDistBearWPRadius[i].WaypointRadius, 0);
                tp.type = ""; //Basic does not have Turnpoint type

                wp.name = $"WP{(i + 1).ToString("D2")}";
                wp.description = wp.name;
                wp.altSmoothed = 0;

                var wpCoord = angles[i].GetWaypointCoordinate(tp.radius);
                wp.lat = wpCoord.Latitude.DecimalDegree;
                wp.lon = wpCoord.Longitude.DecimalDegree;
            

                tp.waypoint = wp;
                turnpoints.Add(tp);
            }

            //Add Final Point
            var wpNextID = angles.Count + 1;
            tp = new Turnpoint();
            wp = new Waypoint();

            tp.radius = fixedTPRadius; //TODO: FIXED VALUE, Should be flexible.
            tp.type = "ESS";

            wp.name = $"WP{wpNextID.ToString("D2")}";
            wp.description = wp.name;
            wp.altSmoothed = 0;
            //TODO: These coordinates need to be extended to cater for the start radius
            wp.lat = angles[0].LegA.Start.Latitude.DecimalDegree;
            wp.lon = angles[0].LegA.Start.Longitude.DecimalDegree;

            tp.waypoint = wp;
            turnpoints.Add(tp);

            return turnpoints;
        }

        public static string ConvertToXcTaskTurnpoints(List<Turnpoint> turnpoints)
        {
            if (turnpoints == null || turnpoints.Count < 2)
            {
                throw new ArgumentException("At least two coordinates are required.");
            }

            StringBuilder sb = new StringBuilder();
          
            sb.Append("\"turnpoints\": [");
          
            for (int i = 0; i < turnpoints.Count; i++)
            {
                var tp = turnpoints[i];

                sb.Append("{");              
                
                    sb.Append($"\"radius\": {tp.radius},");
                
                    sb.Append("\"waypoint\":");
                    sb.Append("{");

                        sb.Append($"\"name\": \"{tp.waypoint.name}\",");
                        sb.Append($"\"description\": \"{tp.waypoint.description}\",");
                        sb.Append($"\"lat\": {tp.waypoint.lat.ToString("F6")},");
                        sb.Append($"\"lon\": {tp.waypoint.lon.ToString("F6")},");
                        sb.Append($"\"altSmoothed\": {tp.waypoint.altSmoothed.ToString()}");
                        //sb.Append($"      \"altitude\": {coordinates[i].Elevation.Meters?.ToString("F0") ?? "0"},");
                    sb.Append("}");

                if (tp.type != "")
                    sb.Append($",\"type\": \"{tp.type}\"");

                sb.Append("}");
                if (i < turnpoints.Count - 1)
                {
                    sb.Append(",");
                }
                else
                {
                    //sb.Append();
                }
            }

            sb.Append("]");

            return sb.ToString();
        }

    }
}
