/**
 * Validation utilities for task and airspace data
 * File path: src/utils/validators.ts
 */

import { XCTask, Waypoint, TaskType, TurnpointType } from '../types/taskTypes';
import { Airspace, Coordinate } from '../types/airspaceTypes';
import { validateCoordinate } from './coordinateUtils';
import { calculateDistance } from './coordinateUtils';

const MIN_TURNPOINTS = 2;
const MAX_TURNPOINTS = 100;
const MIN_CYLINDER_RADIUS = 5; // meters
const MAX_CYLINDER_RADIUS = 50000; // meters

/**
 * Validate a complete task definition
 */
export function validateTask(task: XCTask): boolean {
    try {
        // Check basic task properties
        if (!task.version || !task.taskType || !Array.isArray(task.turnpoints)) {
            return false;
        }

        // Validate task type
        if (task.taskType !== 'CLASSIC') {
            return false;
        }

        // Validate turnpoints array
        if (task.turnpoints.length < MIN_TURNPOINTS || task.turnpoints.length > MAX_TURNPOINTS) {
            return false;
        }

        // Check for required start and end points
        const hasStart = task.turnpoints.some(tp => tp.type === 'SSS');
        const hasEnd = task.turnpoints.some(tp => tp.type === 'ESS');
        if (!hasStart || !hasEnd) {
            return false;
        }

        // Validate each turnpoint
        return task.turnpoints.every((tp, index) => validateTurnpoint(tp));

    } catch (error) {
        console.error('Task validation error:', error);
        return false;
    }
}

/**
 * Validate a single turnpoint
 */
export function validateTurnpoint(turnpoint: any): boolean {
    try {
        // Check basic structure
        if (!turnpoint.radius || !turnpoint.waypoint) {
            return false;
        }

        // Validate radius
        if (turnpoint.radius < MIN_CYLINDER_RADIUS || turnpoint.radius > MAX_CYLINDER_RADIUS) {
            return false;
        }

        // Validate waypoint
        return validateWaypoint(turnpoint.waypoint);

    } catch (error) {
        console.error('Turnpoint validation error:', error);
        return false;
    }
}

/**
 * Validate a waypoint definition
 */
export function validateWaypoint(waypoint: Waypoint): boolean {
    try {
        // Check required properties
        if (!waypoint.name || typeof waypoint.lat !== 'number' || typeof waypoint.lon !== 'number') {
            return false;
        }

        // Validate coordinates
        if (!validateCoordinate(waypoint.lat, waypoint.lon)) {
            return false;
        }

        // Validate altitude if present
        if (waypoint.altSmoothed && typeof waypoint.altSmoothed !== 'number') {
            return false;
        }

        return true;

    } catch (error) {
        console.error('Waypoint validation error:', error);
        return false;
    }
}

/**
 * Validate an airspace definition
 */
export function validateAirspace(airspace: Airspace): boolean {
    try {
        // Check required properties
        if (!airspace.name || !airspace.class || !Array.isArray(airspace.coordinates)) {
            return false;
        }

        // Validate coordinates array
        if (airspace.coordinates.length < 3) { // Minimum for a polygon
            return false;
        }

        // Check all coordinates
        return airspace.coordinates.every(coord => 
            validateCoordinate(coord.lat, coord.lon)
        );

    } catch (error) {
        console.error('Airspace validation error:', error);
        return false;
    }
}

/**
 * Validate task geometry for issues like overlapping cylinders
 */
export function validateTaskGeometry(task: XCTask): boolean {
    try {
        const turnpoints = task.turnpoints;
        
        // Check minimum distance between turnpoints
        for (let i = 0; i < turnpoints.length - 1; i++) {
            const tp1 = turnpoints[i];
            const tp2 = turnpoints[i + 1];
            
            // Calculate distance between turnpoints
            const distance = calculateDistance(
                tp1.waypoint.lat, 
                tp1.waypoint.lon,
                tp2.waypoint.lat,
                tp2.waypoint.lon
            ).meters;

            // Check if cylinders overlap too much
            const minDistance = (tp1.radius + tp2.radius) * 0.5; // Allow 50% overlap
            if (distance < minDistance) {
                return false;
            }
        }

        return true;

    } catch (error) {
        console.error('Task geometry validation error:', error);
        return false;
    }
}

/**
 * Check if a point is within an airspace
 */
function isPointInAirspace(point: Coordinate, airspace: Airspace): boolean {
    // Ray casting algorithm for point-in-polygon
    // x = longitude (east-west), y = latitude (north-south)
    let inside = false;
    const x = point.lon;
    const y = point.lat;

    for (let i = 0, j = airspace.coordinates.length - 1; i < airspace.coordinates.length; j = i++) {
        const xi = airspace.coordinates[i].lon;
        const yi = airspace.coordinates[i].lat;
        const xj = airspace.coordinates[j].lon;
        const yj = airspace.coordinates[j].lat;

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Validate task against airspace restrictions
 */
export function validateAirspaceConflicts(task: XCTask, airspaces: Airspace[]): boolean {
    try {
        // Check each turnpoint against each airspace
        for (const turnpoint of task.turnpoints) {
            const wp = turnpoint.waypoint;
            
            // Check if any turnpoint center is inside restricted airspace
            for (const airspace of airspaces) {
                if (isPointInAirspace({ lat: wp.lat, lon: wp.lon }, airspace)) {
                    return false;
                }
            }
        }

        return true;

    } catch (error) {
        console.error('Airspace conflict validation error:', error);
        return false;
    }
}
