/**
 * Type definitions for geometric calculations and transformations
 * File path: src/types/geometryTypes.ts
 */

export interface Distance {
    meters: number;
    bearing: number;
}

export interface Angle {
    degrees: number;
    radians: number;
}

export interface BoundingBox {
    north: number;
    south: number;
    east: number;
    west: number;
}

export interface TransformationMatrix {
    translation: {
        lat: number;
        lon: number;
    };
    rotation: number;  // in degrees
    scale?: number;    // typically 1 for preserving distances
}

// TODO: Add conversion functions between degrees and radians
// TODO: Add validation for coordinate bounds
// TODO: Add great circle calculation types
