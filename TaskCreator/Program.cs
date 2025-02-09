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
        Console.WriteLine("Please provide the pipe-separated list of distances (meters), relative angles (deg), waypoint sizes (meters) tuples in format \"1000,90,400|2000,180,400|1000,-90,400\"");
        string csvOfDistancesAndAngleDegrees = Console.ReadLine();
        if(string.IsNullOrEmpty(csvOfDistancesAndAngleDegrees))
        {
            Console.WriteLine("No distances and angles provided, using MicroTask v01");
            //MicroTask_v03: 300,315,100|300,-45,100|300,90,100|300,-90,100|300,45,100|300,135,100|300,-135,100|600,-135,100|300,135,100|300,45,100|300,-45,100
            csvOfDistancesAndAngleDegrees = "600,0,50|600,-45,200|600,158,400|600,135,50|600,-90,50|600,90,400|600,-135,100|600,-158,50|600,45,100";
        }
        Console.WriteLine("Should the task finish at the start (close loop)? (y/n)");
        string closeLoopResponse = Console.ReadLine();
        bool closeLoop = closeLoopResponse.ToLower() == "y";
        var taskBuilder = new TaskBuilder(start, csvOfDistancesAndAngleDegrees, closeLoop);
        List<Coordinate> optyPoints = taskBuilder.BuildOptimizedPointsList();
        List<Leg> legs = taskBuilder.BuildLegList(optyPoints);
        List<Angle> angles = taskBuilder.BuildAngleList(legs);
        List<Turnpoint> turnpoints = taskBuilder.BuildTurnpointList(angles);
        var wpInXctskFormat = TaskBuilder.ConvertToXcTaskTurnpoints(turnpoints);
        Console.WriteLine(wpInXctskFormat);

    }
}