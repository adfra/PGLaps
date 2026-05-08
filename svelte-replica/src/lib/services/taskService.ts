import type { XCTask, TaskTransformation, Turnpoint } from '$lib/types/index.js';
import {
	calculateDistance,
	calculateBearing,
	calculateDestination,
	normalizeBearing
} from '$lib/utils/coordinateUtils.js';
import { validateTask, validateTaskGeometry } from '$lib/utils/validators.js';

export function transformTask(task: XCTask, transformation: TaskTransformation): XCTask {
	if (!validateTask(task)) throw new Error('Invalid task data');

	const { newStartLat, newStartLon, rotationAngle } = transformation;
	const oldStart = task.turnpoints[0].waypoint;

	const oldFirstLegBearing = calculateBearing(
		task.turnpoints[0].waypoint.lat,
		task.turnpoints[0].waypoint.lon,
		task.turnpoints[1].waypoint.lat,
		task.turnpoints[1].waypoint.lon
	);
	const totalRotation = normalizeBearing(rotationAngle - oldFirstLegBearing);

	const newTurnpoints: Turnpoint[] = [
		{
			radius: task.turnpoints[0].radius,
			waypoint: {
				name: oldStart.name,
				description: oldStart.description,
				lat: newStartLat,
				lon: newStartLon,
				altSmoothed: oldStart.altSmoothed
			},
			type: task.turnpoints[0].type
		}
	];

	for (let i = 1; i < task.turnpoints.length; i++) {
		const oldPrev = task.turnpoints[i - 1].waypoint;
		const oldCurrent = task.turnpoints[i].waypoint;
		const newPrev = newTurnpoints[i - 1].waypoint;

		const { meters: distance } = calculateDistance(
			oldPrev.lat,
			oldPrev.lon,
			oldCurrent.lat,
			oldCurrent.lon
		);
		const oldBearing = calculateBearing(oldPrev.lat, oldPrev.lon, oldCurrent.lat, oldCurrent.lon);
		const newBearing = normalizeBearing(oldBearing + totalRotation);
		const newPos = calculateDestination(newPrev.lat, newPrev.lon, distance, newBearing);

		const tp: Turnpoint = {
			radius: task.turnpoints[i].radius,
			waypoint: {
				name: oldCurrent.name,
				description: oldCurrent.description,
				lat: newPos.lat,
				lon: newPos.lon,
				altSmoothed: oldCurrent.altSmoothed
			}
		};
		if (task.turnpoints[i].type) tp.type = task.turnpoints[i].type;
		newTurnpoints.push(tp);
	}

	const result: XCTask = {
		version: task.version,
		taskType: task.taskType,
		earthModel: task.earthModel,
		turnpoints: newTurnpoints,
		sss: task.sss,
		goal: task.goal
	};

	if (!validateTask(result) || !validateTaskGeometry(result)) {
		throw new Error('Invalid task transformation result');
	}
	return result;
}

export function calculateTaskStatistics(task: XCTask): {
	totalDistance: number;
	legDistances: number[];
	turnAngles: number[];
} {
	const legDistances: number[] = [];
	const turnAngles: number[] = [];

	for (let i = 0; i < task.turnpoints.length - 1; i++) {
		const a = task.turnpoints[i].waypoint;
		const b = task.turnpoints[i + 1].waypoint;
		legDistances.push(calculateDistance(a.lat, a.lon, b.lat, b.lon).meters);
	}

	for (let i = 1; i < task.turnpoints.length - 1; i++) {
		const prev = task.turnpoints[i - 1].waypoint;
		const cur = task.turnpoints[i].waypoint;
		const next = task.turnpoints[i + 1].waypoint;
		const inB = calculateBearing(prev.lat, prev.lon, cur.lat, cur.lon);
		const outB = calculateBearing(cur.lat, cur.lon, next.lat, next.lon);
		const angle = normalizeBearing(outB - inB);
		turnAngles.push(angle > 180 ? angle - 360 : angle);
	}

	return {
		totalDistance: legDistances.reduce((a, b) => a + b, 0),
		legDistances,
		turnAngles
	};
}
