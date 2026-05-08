import type { XCTask, Waypoint, Airspace } from '$lib/types/index.js';
import { validateCoordinate, calculateDistance } from './coordinateUtils.js';

const MIN_TURNPOINTS = 2;
const MAX_TURNPOINTS = 100;
const MIN_CYLINDER_RADIUS = 5;
const MAX_CYLINDER_RADIUS = 50000;

export function validateTask(task: XCTask): boolean {
	try {
		if (!task.version || !task.taskType || !Array.isArray(task.turnpoints)) return false;
		if (task.taskType !== 'CLASSIC') return false;
		if (task.turnpoints.length < MIN_TURNPOINTS || task.turnpoints.length > MAX_TURNPOINTS)
			return false;
		return task.turnpoints.every((tp) => validateTurnpoint(tp));
	} catch {
		return false;
	}
}

export function validateTurnpoint(turnpoint: { radius?: number; waypoint?: Waypoint }): boolean {
	try {
		if (!turnpoint.radius || !turnpoint.waypoint) return false;
		if (turnpoint.radius < MIN_CYLINDER_RADIUS || turnpoint.radius > MAX_CYLINDER_RADIUS)
			return false;
		return validateWaypoint(turnpoint.waypoint);
	} catch {
		return false;
	}
}

export function validateWaypoint(waypoint: Waypoint): boolean {
	try {
		if (!waypoint.name || typeof waypoint.lat !== 'number' || typeof waypoint.lon !== 'number')
			return false;
		if (!validateCoordinate(waypoint.lat, waypoint.lon)) return false;
		if (waypoint.altSmoothed !== undefined && typeof waypoint.altSmoothed !== 'number') return false;
		return true;
	} catch {
		return false;
	}
}

export function validateAirspace(airspace: Airspace): boolean {
	try {
		if (!airspace.name || !airspace.class || !Array.isArray(airspace.coordinates)) return false;
		if (airspace.coordinates.length < 3) return false;
		return airspace.coordinates.every((c) => validateCoordinate(c.lat, c.lon));
	} catch {
		return false;
	}
}

export function validateTaskGeometry(task: XCTask): boolean {
	try {
		for (let i = 0; i < task.turnpoints.length - 1; i++) {
			const tp1 = task.turnpoints[i];
			const tp2 = task.turnpoints[i + 1];
			const distance = calculateDistance(
				tp1.waypoint.lat,
				tp1.waypoint.lon,
				tp2.waypoint.lat,
				tp2.waypoint.lon
			).meters;
			if (distance < (tp1.radius + tp2.radius) * 0.5) return false;
		}
		return true;
	} catch {
		return false;
	}
}
