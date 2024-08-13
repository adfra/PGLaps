using CoordinateSharp;
using PGLaps;

public class TaskCreator 
{

    public static void Main(string[] args)
    {

        Console.Write("Please provide the starting coordinates for the task in decimal degrees (Google Maps):");
        string coordinateString = Console.ReadLine();
        if( coordinateString == "")
        {
            Console.WriteLine("No coordinates provided, using default start point (Verbier): 46.09720747857883, 7.230137517083873");
            coordinateString = "46.09720747857883, 7.230137517083873";
        }
        var start = new Coordinate();
        if(Coordinate.TryParse(coordinateString, out start))
        {
            Console.WriteLine("Start coordinate set to: " + start);
        }
        else
        {
            Console.WriteLine("Invalid coordinate format");
            return;
        }
        Console.WriteLine("Please provide the list of distances (meters) and angles (deg) in format \"1000,90|2000,180|1000,270\"");
        string csvOfDistancesAndAngleDegrees = Console.ReadLine();
        if(string.IsNullOrEmpty(csvOfDistancesAndAngleDegrees))
        {
            Console.WriteLine("No distances and angles provided, using MicroTask v01");
            csvOfDistancesAndAngleDegrees = "600,0,50|600,-45,200|600,158,400|600,135,50|600,-90,50|600,90,400|600,-135,100|600,-158,50|600,45,100";
        }
        var taskBuilder = new TaskBuilder(start, csvOfDistancesAndAngleDegrees, true);
        List<Coordinate> optyPoints = taskBuilder.BuildOptimizedPointsList();
        List<Leg> legs = taskBuilder.BuildLegList(optyPoints);
        List<Angle> angles = taskBuilder.BuildAngleList(legs);
        List<Turnpoint> turnpoints = taskBuilder.BuildTurnpointList(angles);
        var wpInXctskFormat = TaskBuilder.ConvertToXcTaskTurnpoints(turnpoints);
        Console.WriteLine(wpInXctskFormat);

    }
}