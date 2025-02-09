using System;
using System.Collections.Generic;
using System.IO;
using CoordinateSharp;
using Newtonsoft.Json;
using static Program;
using PGLaps;

public partial class Program
{
    public static void Main(string[] args)
    {

        Console.Write("Please specify the output format for the task - 'xctsk', 'cup' or 'both' (Default: 'both'):");
        string outputFormat = Console.ReadLine();
        if (outputFormat == "") outputFormat = "both";

        if (outputFormat != "xctsk" && outputFormat != "cup" && outputFormat != "both")
        {
            Console.WriteLine("Unknown format requested. Please use either 'xctsk', 'cup'or 'both'. DEFAULTING TO BOTH");
            outputFormat = "both";
        }

        // Read the input task file
        Console.Write("Please enter task filename (.xctsk): ");
        string taskFilename = Console.ReadLine();
        if (taskFilename == "") taskFilename = "PGLap_MiniTask_v1.xctsk"; //Default task file for testing
        if (taskFilename == "" || !File.Exists(taskFilename))
        {
            Console.WriteLine("Task file not found.");
            return;
        }

        var inputJson = File.ReadAllText(taskFilename);
        var inputTask = JsonConvert.DeserializeObject<PGTask>(inputJson);

        // Read the input airspace file
        Console.Write("Please enter airspace filename (.txt): ");
        string airspaceFilename = Console.ReadLine();
        if (airspaceFilename == "") airspaceFilename = "PGLap_MiniTask_v1_Airspace.txt"; //Default airspace file (for testing)
        if (airspaceFilename == "" || !File.Exists(airspaceFilename))
        {
            Console.WriteLine("Airspace file not found.");
            return;
        }

        var airspacesTemplate = ParseOpenAir(airspaceFilename);

        Console.Write("Please enter lat, long for the new starting location from Google Maps (nn.nnnnn, m.mmmmm):");
        string newStartCoordString = Console.ReadLine();
        if (newStartCoordString == "") newStartCoordString = "47.41718775277045, 8.628740563731998"; //Default start location (for testing)
        if (TryParseWaypoint(newStartCoordString, out double newStartLat, out double newStartLon, out Coordinate newStart))
        {
            Console.WriteLine($"Valid waypoint: lat = {newStartLat}, long = {newStartLon}");
        }
        else
        {
            Console.WriteLine("Invalid waypoint format.");
            return;
        }

        Console.Write("Please enter new departure direction in degrees: ");
        if (!double.TryParse(Console.ReadLine(), out double newDepartureDegrees))
        {
            Console.WriteLine("Invalid departure degrees. Please enter a valid number.");
            return;
        }

        // Transform the task
        var transformedTask = TransformTask(inputTask, newStartLat, newStartLon, newDepartureDegrees);

        // Transform the airspaces
        var tmplStartLat = inputTask.turnpoints[0].waypoint.lat;
        var tmplStartLon = inputTask.turnpoints[0].waypoint.lon;
        Coordinate tmplStart = new Coordinate(tmplStartLat, tmplStartLon);
        Coordinate tmplWP1 = new Coordinate(inputTask.turnpoints[1].waypoint.lat, inputTask.turnpoints[1].waypoint.lon);
        var tmplFirstLeg = new Distance(tmplStart, tmplWP1);
        var rotationAngle = (newDepartureDegrees - tmplFirstLeg.Bearing + 360) % 360;


        var transformedAirspaces = TransformAirspaces(airspacesTemplate, tmplStart, newStart, rotationAngle);

        // Write the output files
        string timestamp = DateTime.Now.ToString("yyyyMMdd-HHmm");

        if (outputFormat == "xctsk" || outputFormat == "both")
        {
            string outputFilename = $"TransformedTask_{timestamp}.xctsk";

            var settings = new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
                NullValueHandling = NullValueHandling.Ignore
            };

            File.WriteAllText(outputFilename, JsonConvert.SerializeObject(transformedTask, Formatting.Indented, settings));
            Console.WriteLine($"Tasks transformed and saved to {outputFilename}");
        }
        if (outputFormat == "cup" || outputFormat == "both")
        {
            string outputFilename = $"TransformedTask_{timestamp}.cup";
            File.WriteAllText(outputFilename, ConvertToCup(transformedTask));
            Console.WriteLine($"Tasks transformed and saved to {outputFilename}");
        }

        // Write the transformed airspaces
        string airspaceOutputFilename = $"TransformedAirspaces_{timestamp}.txt";
        WriteOpenAir(transformedAirspaces, airspaceOutputFilename);
        Console.WriteLine($"Airspaces transformed and saved to {airspaceOutputFilename}");
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        var c1 = new Coordinate(lat1, lon1);
        var c2 = new Coordinate(lat2, lon2);
        var distance = new Distance(c1, c2);

        return distance.Meters;

    }

    private static double CalculateBearing(double lat1, double lon1, double lat2, double lon2)
    {
        var c1 = new Coordinate(lat1, lon1);
        var c2 = new Coordinate(lat2, lon2);
        var distance = new Distance(c1, c2);

        return distance.Bearing;
    }

    private static (double lat, double lon) CalculateDestination(double lat, double lon, double bearing, double distanceInMeters)
    {
        var c1 = new Coordinate(lat, lon);
        c1.Move(distanceInMeters, bearing, Shape.Ellipsoid);
        return (c1.Latitude.DecimalDegree, c1.Longitude.DecimalDegree);
    }

    private static PGTask TransformTask(PGTask task, double newStartLat, double newStartLon, double newHeading)
    {
        var oldStart = task.turnpoints[0].waypoint;
        var newTurnpoints = new List<Turnpoint>();

        // Transform the start point
        newTurnpoints.Add(new Turnpoint
        {
            radius = task.turnpoints[0].radius,
            waypoint = new Waypoint
            {
                name = oldStart.name,
                description = oldStart.description,
                lat = newStartLat,
                lon = newStartLon,
                altSmoothed = oldStart.altSmoothed
            },
            type = task.turnpoints[0].type //This is Ok as this should be SSS here. 
        });

        // Calculate the rotation angle
        var oldFirstLegBearing = CalculateBearing(task.turnpoints[0].waypoint.lat, task.turnpoints[0].waypoint.lon,
                                                  task.turnpoints[1].waypoint.lat, task.turnpoints[1].waypoint.lon);
        var rotationAngle = newHeading - oldFirstLegBearing;

        for (int i = 1; i < task.turnpoints.Count; i++)
        {
            var oldPrev = task.turnpoints[i - 1].waypoint;
            var oldCurrent = task.turnpoints[i].waypoint;
            var newPrev = newTurnpoints[i - 1].waypoint;

            // Calculate distance and bearing from previous to current point
            var distance = CalculateDistance(oldPrev.lat, oldPrev.lon, oldCurrent.lat, oldCurrent.lon);
            var oldBearing = CalculateBearing(oldPrev.lat, oldPrev.lon, oldCurrent.lat, oldCurrent.lon);

            // Apply rotation to the bearing
            var newBearing = (oldBearing + rotationAngle + 360) % 360;

            // Calculate new position
            var (newLat, newLon) = CalculateDestination(newPrev.lat, newPrev.lon, newBearing, distance);

            var newTurnpoint = new Turnpoint
            {
                radius = task.turnpoints[i].radius,
                waypoint = new Waypoint
                {
                    name = oldCurrent.name,
                    description = oldCurrent.description,
                    lat = newLat,
                    lon = newLon,
                    altSmoothed = oldCurrent.altSmoothed
                }
            };

            if (task.turnpoints[i].type != null && task.turnpoints[i].type != "") //Omit if not SSS or ESS
            {
                newTurnpoint.type = task.turnpoints[i].type;
            }

            newTurnpoints.Add(newTurnpoint);
        }

        return new PGTask
        {
            version = task.version,
            taskType = task.taskType,
            earthModel = task.earthModel,
            sss = task.sss,
            goal = task.goal,
            turnpoints = newTurnpoints
        };
    }

    private static string ConvertToCup(PGTask task)
    {
        var cupLines = new List<string>
        {
            "name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc"
        };

        foreach (var turnpoint in task.turnpoints)
        {
            var wp = turnpoint.waypoint;
            var c = new Coordinate(wp.lat, wp.lon);

            c.FormatOptions.Format = CoordinateFormatType.Degree_Decimal_Minutes;
            c.FormatOptions.Display_Leading_Zeros = true;
            c.FormatOptions.Round = 3;

            var latDegrees = c.Latitude.Degrees.ToString("00");
            var latMinutes = c.Latitude.DecimalMinute.ToString("00.000");
            var latHemisphere = c.Latitude.ToString().Substring(0, 1);

            var lonDegrees = c.Longitude.Degrees.ToString("000");
            var lonMinutes = c.Longitude.DecimalMinute.ToString("00.000");
            var lonHemisphere = c.Longitude.ToString().Substring(0, 1);

            var lat = $"{latDegrees}{latMinutes}{latHemisphere}";
            var lon = $"{lonDegrees}{lonMinutes}{lonHemisphere}";
          
            //var lat = $"{Math.Abs(wp.lat):00}{Math.Abs(wp.lat % 1 * 60):00.000}{(wp.lat >= 0 ? "N" : "S")}";
            //var lon = $"{Math.Abs(wp.lon):000}{Math.Abs(wp.lon % 1 * 60):00.000}{(wp.lon >= 0 ? "E" : "W")}";
            cupLines.Add($"\"{wp.name}\",{wp.name},,{lat},{lon},{wp.altSmoothed}m,1,,,,");
        }

        cupLines.Add("-----Related Tasks-----");
        var taskLine = $"\"{task.taskType}\",\"\",{string.Join(",", task.turnpoints.Select(tp => $"\"{tp.waypoint.name}\""))},\"\"";
        cupLines.Add(taskLine);

        cupLines.Add("Options,GoalIsLine=True,Competition=True");

        for (int i = 0; i < task.turnpoints.Count; i++)
        {
            var tp = task.turnpoints[i];
            var obsZoneLine = $"ObsZone={i},R1={tp.radius}m";
            if (tp.type == "SSS") obsZoneLine += ",sss=True";
            if (tp.type == "ESS") obsZoneLine += ",ess=True,Line=True";
            cupLines.Add(obsZoneLine);
        }

        return string.Join("\n", cupLines);
    }

    static bool TryParseWaypoint(string waypoint, out double lat, out double lon, out Coordinate coordinate)
    {
        lat = 0;
        lon = 0;
        coordinate = null;

        Coordinate c;
        if (Coordinate.TryParse(waypoint, out c))
        {
            lat = c.Latitude.DecimalDegree;
            lon = c.Longitude.DecimalDegree;
            coordinate = c;
            return true;
        }

        return false;        
    }

    

    /// <summary>
    /// FROM HERE THE CODE RELATES TO AIRSPACE HANDLING
    /// </summary>
    /// 

    private static List<Airspace> ParseOpenAir(string filename)
    {
        var airspaces = new List<Airspace>();
        Airspace currentAirspace = null;

        foreach (var line in File.ReadLines(filename))
        {
            var trimmedLine = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmedLine)) continue;

            if (trimmedLine.StartsWith("AC"))
            {
                if (currentAirspace != null) 
                    airspaces.Add(currentAirspace);
                currentAirspace = new Airspace { Class = trimmedLine.Substring(3) };
            }
            else if (trimmedLine.StartsWith("AN")) currentAirspace.Name = trimmedLine.Substring(3);
            else if (trimmedLine.StartsWith("AL")) currentAirspace.Floor = trimmedLine.Substring(3);
            else if (trimmedLine.StartsWith("AH")) currentAirspace.Ceiling = trimmedLine.Substring(3);
            else if (trimmedLine.StartsWith("DP"))
            {
                var coordinateString = trimmedLine.Substring(3).Replace(":","-");

                Coordinate c; //Create new Coordindate to populate
                if (Coordinate.TryParse(coordinateString, out c)) //Coordinate parse was successful, Coordinate object has now been created and populated
                {
                    currentAirspace.Coordinates.Add(c);  
                } else {
                    Console.WriteLine("Airspace Coordinate parse failed");
                }
            }
        }

        if (currentAirspace != null) airspaces.Add(currentAirspace);
        return airspaces;
    }

    private static List<Airspace> TransformAirspaces(List<Airspace> templateAirspaces, Coordinate tmplStart, Coordinate newStart, double rotationDegrees)
    {
        var transformedAirspaces = new List<Airspace>();

        // Calculate the rotation angle
        //var firstTmplAirspaceCoord = templateAirspaces[0].Coordinates[0];
        //var startToFirstAirspaceCoord = new Distance(tmplStart, firstTmplAirspaceCoord);
        //var tmplFirstLegBearing = startToFirstAirspaceCoord.Bearing;
        //var rotationAngle = newHeading - tmplFirstLegBearing;

        //var prevTmplCoord = tmplStart;
        //var prevNewCoord = newStart;

        foreach (var airspace in templateAirspaces)
        {
            var transformedAirspace = new Airspace
            {
                Name = airspace.Name,
                Class = airspace.Class,
                Floor = airspace.Floor,
                Ceiling = airspace.Ceiling
            };

            foreach (Coordinate curTmplCoord in airspace.Coordinates)
            {
                // Calculate distance and bearing from template start to current template coordinate
                var tmplLeg = new Distance(tmplStart, curTmplCoord);

                // Apply rotation to the bearing
                var newBearing = (tmplLeg.Bearing + rotationDegrees + 360) % 360;

                // Calculate new position
                Coordinate newCoord = new Coordinate(newStart.Latitude.DecimalDegree, newStart.Longitude.DecimalDegree);
                newCoord.Move(tmplLeg.Meters, newBearing, Shape.Ellipsoid);

                transformedAirspace.Coordinates.Add(newCoord);
            }

            transformedAirspaces.Add(transformedAirspace);
        }

        return transformedAirspaces;
    }

    private static void WriteOpenAir(List<Airspace> airspaces, string filename)
    {
        using (var writer = new StreamWriter(filename))
        {
            foreach (var airspace in airspaces)
            {
                writer.WriteLine($"AC {airspace.Class}");
                writer.WriteLine($"AN {airspace.Name}");
                writer.WriteLine($"AL {airspace.Floor}");
                writer.WriteLine($"AH {airspace.Ceiling}");
                foreach (Coordinate coord in airspace.Coordinates)
                {

                    coord.FormatOptions.Format = CoordinateFormatType.Degree_Minutes_Seconds; 
                    string openAirCoord = GetOpenAirCoordinate(coord);
                    writer.WriteLine($"DP {openAirCoord}");
                }
                writer.WriteLine();
            }
        }
    }

    private static string GetOpenAirCoordinate(Coordinate c)
    {
        c.FormatOptions.Format = CoordinateFormatType.Degree_Minutes_Seconds;

        //convert to deg:min:sec N
        var lat = c.Latitude.Degrees.ToString("00") + ":" + c.Latitude.Minutes.ToString("00") + ":" + c.Latitude.Seconds.ToString("00") + " " + c.Latitude.Position;
        var lon = c.Longitude.Degrees.ToString("000") + ":" + c.Longitude.Minutes.ToString("00") + ":" + c.Longitude.Seconds.ToString("00") + " " + c.Longitude.Position;

        return lat+" "+lon;
    }
}