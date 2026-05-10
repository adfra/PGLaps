/**
 * Service for handling task transformations
 * File path: src/services/taskService.ts
 */

import { XCTask, TaskTransformation, Turnpoint, Waypoint } from '../types/taskTypes';
import { Distance, Angle } from '../types/geometryTypes';
import { 
    calculateDistance, 
    calculateBearing, 
    calculateDestination, 
    normalizeBearing 
} from '../utils/coordinateUtils';
import { validateTask, validateTaskGeometry } from '../utils/validators';

export class TaskService {
    /**
     * Transform a task to a new location while maintaining relative geometry
     */
    public transformTask(task: XCTask, transformation: TaskTransformation): XCTask {
        if (!validateTask(task)) {
            throw new Error('Invalid task data');
        }

        const { newStartLat, newStartLon, rotationAngle } = transformation;

        // Start with a deep copy of the task
        const newTask: XCTask = JSON.parse(JSON.stringify(task));
        const newTurnpoints: Turnpoint[] = [];

        // Get the old start point
        const oldStart = task.turnpoints[0].waypoint;

        // Transform the start point
        newTurnpoints.push({
            radius: task.turnpoints[0].radius,
            waypoint: {
                name: oldStart.name,
                description: oldStart.description,
                lat: newStartLat,
                lon: newStartLon,
                altSmoothed: oldStart.altSmoothed
            },
            type: task.turnpoints[0].type
        });

        // Calculate the rotation angle
        const oldFirstLegBearing = calculateBearing(
            task.turnpoints[0].waypoint.lat,
            task.turnpoints[0].waypoint.lon,
            task.turnpoints[1].waypoint.lat,
            task.turnpoints[1].waypoint.lon
        );

        // Calculate total rotation needed
        const totalRotation = normalizeBearing(rotationAngle - oldFirstLegBearing);

        // Transform each subsequent turnpoint
        for (let i = 1; i < task.turnpoints.length; i++) {
            const oldPrev = task.turnpoints[i - 1].waypoint;
            const oldCurrent = task.turnpoints[i].waypoint;
            const newPrev = newTurnpoints[i - 1].waypoint;

            // Calculate distance and bearing from previous to current point
            const distance = calculateDistance(
                oldPrev.lat,
                oldPrev.lon,
                oldCurrent.lat,
                oldCurrent.lon
            ).meters;

            const oldBearing = calculateBearing(
                oldPrev.lat,
                oldPrev.lon,
                oldCurrent.lat,
                oldCurrent.lon
            );

            // Apply rotation to the bearing
            const newBearing = normalizeBearing(oldBearing + totalRotation);

            // Calculate new position
            const newPosition = calculateDestination(
                newPrev.lat,
                newPrev.lon,
                distance,
                newBearing
            );

            // Create new turnpoint
            const newTurnpoint: Turnpoint = {
                radius: task.turnpoints[i].radius,
                waypoint: {
                    name: oldCurrent.name,
                    description: oldCurrent.description,
                    lat: newPosition.lat,
                    lon: newPosition.lon,
                    altSmoothed: oldCurrent.altSmoothed
                }
            };

            // Preserve special turnpoint types (SSS, ESS)
            if (task.turnpoints[i].type) {
                newTurnpoint.type = task.turnpoints[i].type;
            }

            newTurnpoints.push(newTurnpoint);
        }

        // Create the transformed task
        const transformedTask: XCTask = {
            version: task.version,
            taskType: task.taskType,
            earthModel: task.earthModel,
            turnpoints: newTurnpoints,
            sss: task.sss,
            goal: task.goal
        };

        // Validate the transformed task
        if (!validateTask(transformedTask)) {
            throw new Error('Invalid task transformation result');
        }

        return transformedTask;
    }

    /**
     * Calculate task statistics
     */
    public calculateTaskStatistics(task: XCTask): {
        totalDistance: number;
        legDistances: number[];
        turnAngles: number[];
    } {
        const legDistances: number[] = [];
        const turnAngles: number[] = [];

        // Calculate distances for each leg
        for (let i = 0; i < task.turnpoints.length - 1; i++) {
            const current = task.turnpoints[i].waypoint;
            const next = task.turnpoints[i + 1].waypoint;
            
            const distance = calculateDistance(
                current.lat,
                current.lon,
                next.lat,
                next.lon
            ).meters;

            legDistances.push(distance);
        }

        // Calculate turn angles
        for (let i = 1; i < task.turnpoints.length - 1; i++) {
            const prev = task.turnpoints[i - 1].waypoint;
            const current = task.turnpoints[i].waypoint;
            const next = task.turnpoints[i + 1].waypoint;

            const incomingBearing = calculateBearing(
                prev.lat,
                prev.lon,
                current.lat,
                current.lon
            );

            const outgoingBearing = calculateBearing(
                current.lat,
                current.lon,
                next.lat,
                next.lon
            );

            const turnAngle = normalizeBearing(outgoingBearing - incomingBearing);
            turnAngles.push(turnAngle > 180 ? turnAngle - 360 : turnAngle);
        }

        return {
            totalDistance: legDistances.reduce((a, b) => a + b, 0),
            legDistances,
            turnAngles
        };
    }

    /**
     * Preview a task transformation
     * Returns positions without creating full turnpoint objects
     */
    public previewTransformation(
        task: XCTask, 
        transformation: TaskTransformation
    ): Array<{ lat: number; lon: number }> {
        const preview: Array<{ lat: number; lon: number }> = [];
        
        try {
            const transformedTask = this.transformTask(task, transformation);
            preview.push(...transformedTask.turnpoints.map(tp => ({
                lat: tp.waypoint.lat,
                lon: tp.waypoint.lon
            })));
        } catch (error) {
            console.error('Preview generation failed:', error);
        }

        return preview;
    }
}

export default new TaskService();
