# PGLaps - Task Creator

This little command line tool is used to create a the turnpoints text component of a .xctsk file (XCTrack). The usage is quite simple:
1. To run, PLS download the latest PGLapsTaskCreator_vXX.exe and run the file. A CMD window pops up requesting the necessary inputs:
2. Enter the starting coordinates in the format "lat, lon" (e.g. 47.123456, 11.123456) and press enter. (For the coordinates go to maps.google.com, right click on the starting point and left click on the coordinates displayed. Then paste into the cmd line."))
3. Enter the legs of the task as a list of | separated tuples in the format "Distance, DirectionChangeInDegrees, WaypointSizeInMeters"

Example:
``` 100, 90, 1000 | 200, -180, 1000 | 300, 270, 1000 | 400, 20, 1000 ```
This would create a task with 4 legs, each with a length of 100, 200, 300 and 400 m, respectively. The direction changes are 90, -180, 270 and 0 degrees, respectively. The waypoint size is 1000 meters for each leg.

Note: The degree value of the first leg defines the task start direction (so is an absolute bearing, rather than a change).

4. The output is a text string that should replace (within an existing xctrk file) the complete "turnpoints" section. It can be copied into the XCTrack .xctsk file with your favorite editor (e.g. Notepad++).