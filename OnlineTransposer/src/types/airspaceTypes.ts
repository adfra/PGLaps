/**
 * Type definitions for Airspace data structures
 * File path: src/types/airspaceTypes.ts
 */

export interface Coordinate {
    lat: number;
    lon: number;
    alt?: number;
}

export interface AirspacePoint extends Coordinate {
    type: 'DP' | 'V' | 'X';  // DP = Data Point, V = Variable, X = Reference point
    description?: string;
}

export interface Airspace {
    name: string;
    class: string;
    floor: string;
    ceiling: string;
    coordinates: AirspacePoint[];
}

export interface AirspaceTransformation {
    templateStart: Coordinate;
    newStart: Coordinate;
    rotationAngle: number;
}

// TODO: Add validation functions
// TODO: Add parsing functions for OpenAir format
// TODO: Add serialization functions
