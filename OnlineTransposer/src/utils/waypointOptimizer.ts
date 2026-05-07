/**
 * Optimized waypoint calculation utilities
 * Ported from PGLaps C# Angle.GetWaypointCoordinate method
 * File path: src/utils/waypointOptimizer.ts
 */

import { Turnpoint } from '../types/taskTypes';
import { calculateBearing, normalizeBearing, calculateDestination } from './coordinateUtils';

interface OptimizedWaypoint {
    lat: number;
    lon: number;
    radius: number;
}

interface Leg {
    start: { lat: number; lon: number };
    end: { lat: number; lon: number };
    bearing: number;
    distance: number;
}

interface Angle {
    legA: Leg;
    legB: Leg;
    degreesInside: number;
    degreesOutside: number;
    degreeChange: number;
    turnDirection: 'left' | 'right';
}

/**
 * Calculate inside angle between two bearings
 */
function calculateInsideAngle(bearing1: number, bearing2: number): number {
    const normalizedBearing1 = normalizeBearing(bearing1 + 180); // Reverse bearing
    const normalizedBearing2 = normalizeBearing(bearing2);

    const angleDifference = Math.abs(normalizedBearing1 - normalizedBearing2);

    // Return the smaller angle (inside angle)
    return Math.min(angleDifference, 360 - angleDifference);
}

/**
 * Calculate degree change between two bearings
 */
function calculateDegreeChange(bearing1: number, bearing2: number): number {
    const normalizedBearing1 = normalizeBearing(bearing1);
    const normalizedBearing2 = normalizeBearing(bearing2);

    let difference = normalizedBearing2 - normalizedBearing1;

    // Normalize the difference to be between -180 and 180 degrees
    if (difference > 180) {
        difference -= 360;
    } else if (difference < -180) {
        difference += 360;
    }

    return difference;
}

/**
 * Calculate angle between two connected legs
 */
function createAngle(legA: Leg, legB: Leg): Angle {
    const degreesInside = calculateInsideAngle(legA.bearing, legB.bearing);
    const degreeChange = calculateDegreeChange(legA.bearing, legB.bearing);
    const turnDirection: 'left' | 'right' = degreeChange < 0 ? 'left' : 'right';

    return {
        legA,
        legB,
        degreesInside,
        degreesOutside: 360 - degreesInside,
        degreeChange,
        turnDirection
    };
}

/**
 * Calculate optimized waypoint coordinate for display
 * Returns the TOUCH POINT where optimal path touches the cylinder (not the center)
 */
function getOptimizedWaypointCoordinate(angle: Angle, waypointRadius: number): { lat: number; lon: number } {
    // First, calculate the cylinder center using the C# algorithm
    const halfOutsideAngle = angle.degreesOutside / 2;
    const reverseLegABearing = normalizeBearing(angle.legA.bearing + 180);

    // C#: LEFT = -1, RIGHT = +1
    const centerBearing = normalizeBearing(
        reverseLegABearing + (angle.turnDirection === 'left' ? -1 : 1) * halfOutsideAngle
    );

    // For display, we want the TOUCH POINT (180° opposite to center)
    const touchPointBearing = normalizeBearing(centerBearing + 180);

    console.log('Touch Point Calculation (180° opposite to center):');
    console.log('  LegA bearing:', angle.legA.bearing);
    console.log('  LegB bearing:', angle.legB.bearing);
    console.log('  Turn direction:', angle.turnDirection);
    console.log('  Turn direction multiplier:', angle.turnDirection === 'left' ? -1 : 1);
    console.log('  Inside angle:', angle.degreesInside);
    console.log('  Outside angle:', angle.degreesOutside);
    console.log('  Half outside angle:', halfOutsideAngle);
    console.log('  Reverse LegA bearing:', reverseLegABearing);
    console.log('  Center bearing:', centerBearing);
    console.log('  Touch point bearing (+180°):', touchPointBearing);
    console.log('  Formula:', `${reverseLegABearing} + (${angle.turnDirection === 'left' ? -1 : 1}) * ${halfOutsideAngle} = ${centerBearing} → ${touchPointBearing}`);

    // Calculate the touch point position (where optimal path touches cylinder)
    const touchPoint = calculateDestination(
        angle.legA.end.lat,
        angle.legA.end.lon,
        waypointRadius,
        touchPointBearing
    );

    return touchPoint;
}

/**
 * Calculate optimized task line between cylinders
 * Returns an array of coordinates representing the shortest path between turnpoint cylinders
 */
export function calculateOptimizedTaskLine(turnpoints: Turnpoint[]): Array<{ lat: number; lon: number }> {
    if (turnpoints.length < 2) {
        return turnpoints.map(tp => ({ lat: tp.waypoint.lat, lon: tp.waypoint.lon }));
    }

    const optimizedCoordinates: Array<{ lat: number; lon: number }> = [];

    // Start with first turnpoint center
    optimizedCoordinates.push({
        lat: turnpoints[0].waypoint.lat,
        lon: turnpoints[0].waypoint.lon
    });

    // For each intermediate turnpoint, calculate optimized position
    for (let i = 1; i < turnpoints.length - 1; i++) {
        const prevTP = turnpoints[i - 1];
        const currentTP = turnpoints[i];
        const nextTP = turnpoints[i + 1];

        // Create legs
        const legA: Leg = {
            start: { lat: prevTP.waypoint.lat, lon: prevTP.waypoint.lon },
            end: { lat: currentTP.waypoint.lat, lon: currentTP.waypoint.lon },
            bearing: calculateBearing(
                prevTP.waypoint.lat,
                prevTP.waypoint.lon,
                currentTP.waypoint.lat,
                currentTP.waypoint.lon
            ),
            distance: 0 // Not needed for this calculation
        };

        const legB: Leg = {
            start: { lat: currentTP.waypoint.lat, lon: currentTP.waypoint.lon },
            end: { lat: nextTP.waypoint.lat, lon: nextTP.waypoint.lon },
            bearing: calculateBearing(
                currentTP.waypoint.lat,
                currentTP.waypoint.lon,
                nextTP.waypoint.lat,
                nextTP.waypoint.lon
            ),
            distance: 0 // Not needed for this calculation
        };

        // Create angle and calculate optimized waypoint
        const angle = createAngle(legA, legB);
        const optimizedWP = getOptimizedWaypointCoordinate(angle, currentTP.radius);

        optimizedCoordinates.push(optimizedWP);
    }

    // End with last turnpoint center
    optimizedCoordinates.push({
        lat: turnpoints[turnpoints.length - 1].waypoint.lat,
        lon: turnpoints[turnpoints.length - 1].waypoint.lon
    });

    return optimizedCoordinates;
}
