/**
 * Utility functions for coordinate calculations
 * File path: src/utils/coordinateUtils.ts
 */

import { Distance, Angle } from '../types/geometryTypes';

const EARTH_RADIUS = 6371000; // meters
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculate distance and initial bearing between two points using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): Distance {
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const deltaPhi = (lat2 - lat1) * DEG_TO_RAD;
    const deltaLambda = (lon2 - lon1) * DEG_TO_RAD;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = EARTH_RADIUS * c;

    // Calculate bearing
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    const bearing = normalizeBearing(Math.atan2(y, x) * RAD_TO_DEG);

    return {
        meters: distance,
        bearing: bearing
    };
}

/**
 * Calculate initial bearing between two points
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return calculateDistance(lat1, lon1, lat2, lon2).bearing;
}

/**
 * Calculate destination point given starting point, distance and bearing
 */
export function calculateDestination(
    lat: number, 
    lon: number, 
    distance: number, 
    bearing: number
): { lat: number; lon: number } {
    const phi1 = lat * DEG_TO_RAD;
    const lambda1 = lon * DEG_TO_RAD;
    const brng = bearing * DEG_TO_RAD;
    const d = distance / EARTH_RADIUS; // angular distance

    const phi2 = Math.asin(
        Math.sin(phi1) * Math.cos(d) +
        Math.cos(phi1) * Math.sin(d) * Math.cos(brng)
    );

    const lambda2 = lambda1 + Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(phi1),
        Math.cos(d) - Math.sin(phi1) * Math.sin(phi2)
    );

    return {
        lat: phi2 * RAD_TO_DEG,
        lon: ((lambda2 * RAD_TO_DEG + 540) % 360 - 180) // normalize to -180..+180
    };
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
    return degrees * DEG_TO_RAD;
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
    return radians * RAD_TO_DEG;
}

/**
 * Normalize bearing to 0-360 degrees
 */
export function normalizeBearing(bearing: number): number {
    return ((bearing % 360) + 360) % 360;
}

/**
 * Validate coordinate is within valid range
 */
export function validateCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
