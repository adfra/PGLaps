// ── XCTrack task format types ─────────────────────────────────────────────────

export type EarthModel = 'WGS84' | 'FAI_SPHERE';
export type XCTaskType = 'CLASSIC';
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
	taskType: XCTaskType;
	earthModel: EarthModel;
	turnpoints: Turnpoint[];
	sss?: StartSettings;
	goal?: GoalSettings;
}

export interface TaskTransformation {
	newStartLat: number;
	newStartLon: number;
	rotationAngle: number;
}

// ── Airspace types ────────────────────────────────────────────────────────────

export interface Coordinate {
	lat: number;
	lon: number;
	alt?: number;
}

export interface AirspacePoint extends Coordinate {
	type: 'DP' | 'V' | 'X';
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

// ── Geometry types ────────────────────────────────────────────────────────────

export interface Distance {
	meters: number;
	bearing: number;
}

// ── Modular task library types ────────────────────────────────────────────────

/** Definition of a single field in a task type's schema. Stored as JSON in the DB. */
export interface TaskFieldDef {
	key: string;
	label: string;
	type: 'text' | 'number' | 'select' | 'boolean' | 'textarea';
	unit?: string;
	options?: string[];
	required?: boolean;
	description?: string;
}

/** A task type defines the structure and metadata for a category of tasks. */
export interface TaskType {
	id: number;
	slug: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	fieldSchema: TaskFieldDef[];
	createdAt: string;
}

/** A stored task referencing a task type. `data` keys are defined by the type's fieldSchema. */
export interface Task {
	id: number;
	typeId: number;
	type?: TaskType;
	name: string;
	description: string;
	location: string;
	data: Record<string, unknown>;
	waypoints: StoredWaypoint[];
	legs: StoredLeg[];
	xctskContent?: string;
	createdAt: string;
	updatedAt: string;
}

export interface StoredWaypoint {
	name: string;
	lat: number;
	lon: number;
	altSmoothed: number;
	radius: number;
}

export interface StoredLeg {
	distance: number;
	bearing: number;
	radius: number;
}

// ── Notification ──────────────────────────────────────────────────────────────

export interface Notification {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
}
