/**
 * Type definitions for XCTrack task format
 * Based on specification from XCTrack documentation
 * File path: src/types/taskTypes.ts
 */

export type EarthModel = 'WGS84' | 'FAI_SPHERE';
export type TaskType = 'CLASSIC';
export type StartType = 'RACE' | 'ELAPSED-TIME';
export type Direction = 'ENTER' | 'EXIT';
export type GoalType = 'CYLINDER' | 'LINE';
export type TurnpointType = 'TAKEOFF' | 'SSS' | 'ESS';

export interface Waypoint {
    name: string;
    description?: string;
    lat: number;
    lon: number;
    altSmoothed: number;
}

export interface Turnpoint {
    type?: TurnpointType;
    radius: number;
    waypoint: Waypoint;
}

export interface StartSettings {
    type: StartType;
    direction: Direction;
    timeGates: string[];
}

export interface GoalSettings {
    type: GoalType;
    deadline: string;
}

export interface XCTask {
    version: number;
    taskType: TaskType;
    earthModel: EarthModel;
    turnpoints: Turnpoint[];
    sss?: StartSettings;
    goal?: GoalSettings;
}

// Transformation specific types
export interface TaskTransformation {
    newStartLat: number;
    newStartLon: number;
    rotationAngle: number;
}

// TODO: Add validation functions for each interface
// TODO: Add serialization/deserialization methods
// TODO: Add type guards for runtime type checking
