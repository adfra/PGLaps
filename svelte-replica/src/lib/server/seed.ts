import { db } from './db.js';
import type { TaskFieldDef } from '$lib/types/index.js';

function fields(defs: TaskFieldDef[]): string {
	return JSON.stringify(defs);
}

export function seedDatabase(): void {
	const { n } = db.prepare('SELECT COUNT(*) as n FROM task_types').get() as { n: number };
	if (n > 0) return;

	const insertType = db.prepare(`
    INSERT INTO task_types (slug, name, description, icon, color, field_schema)
    VALUES (@slug, @name, @description, @icon, @color, @fieldSchema)
  `);

	const sclrResult = insertType.run({
		slug: 'sclr',
		name: 'Short Circuit Lap Racing',
		description:
			'A closed-circuit lap racing format where pilots repeat a short course multiple times. Designed for spectator-friendly, exciting racing over terrain.',
		icon: '🔄',
		color: '#007bff',
		fieldSchema: fields([
			{ key: 'totalDistance', label: 'Total Distance', type: 'number', unit: 'km', required: true },
			{ key: 'legCount', label: 'Number of Legs', type: 'number', required: true },
			{ key: 'lapCount', label: 'Number of Laps', type: 'number', required: false },
			{
				key: 'startType',
				label: 'Start Type',
				type: 'select',
				options: ['RACE', 'ELAPSED-TIME'],
				required: true
			},
			{
				key: 'startTime',
				label: 'Start Time',
				type: 'text',
				required: false,
				description: 'e.g. 13:00:00'
			},
			{
				key: 'goalType',
				label: 'Goal Type',
				type: 'select',
				options: ['CYLINDER', 'LINE'],
				required: true
			},
			{
				key: 'earthModel',
				label: 'Earth Model',
				type: 'select',
				options: ['WGS84', 'FAI_SPHERE'],
				required: true
			},
			{ key: 'notes', label: 'Notes', type: 'textarea', required: false }
		])
	});

	insertType.run({
		slug: 'hike-and-fly',
		name: 'Hike & Fly',
		description:
			'Pilots carry their equipment on foot to a launch site before completing an aerial task. Combines alpine hiking with paragliding.',
		icon: '🏔️',
		color: '#28a745',
		fieldSchema: fields([
			{ key: 'totalDistance', label: 'Total Distance', type: 'number', unit: 'km', required: true },
			{
				key: 'hikeDistance',
				label: 'Hike Distance',
				type: 'number',
				unit: 'km',
				required: false
			},
			{
				key: 'elevationGain',
				label: 'Elevation Gain',
				type: 'number',
				unit: 'm',
				required: false
			},
			{
				key: 'startType',
				label: 'Start Type',
				type: 'select',
				options: ['RACE', 'ELAPSED-TIME'],
				required: true
			},
			{
				key: 'goalType',
				label: 'Goal Type',
				type: 'select',
				options: ['CYLINDER', 'LINE'],
				required: true
			},
			{ key: 'notes', label: 'Notes', type: 'textarea', required: false }
		])
	});

	insertType.run({
		slug: 'cross-country',
		name: 'Cross-Country (XC)',
		description:
			'Free-flight task navigating between waypoints over distance. The classic paragliding competition format.',
		icon: '🌄',
		color: '#6f42c1',
		fieldSchema: fields([
			{ key: 'totalDistance', label: 'Total Distance', type: 'number', unit: 'km', required: true },
			{
				key: 'legCount',
				label: 'Number of Turnpoints',
				type: 'number',
				required: true
			},
			{
				key: 'startType',
				label: 'Start Type',
				type: 'select',
				options: ['RACE', 'ELAPSED-TIME'],
				required: true
			},
			{
				key: 'goalType',
				label: 'Goal Type',
				type: 'select',
				options: ['CYLINDER', 'LINE'],
				required: true
			},
			{
				key: 'earthModel',
				label: 'Earth Model',
				type: 'select',
				options: ['WGS84', 'FAI_SPHERE'],
				required: true
			},
			{ key: 'notes', label: 'Notes', type: 'textarea', required: false }
		])
	});

	insertType.run({
		slug: 'speed-run',
		name: 'Speed Run',
		description:
			'Head-to-head sprint on a defined short course. Pilots race for the fastest time.',
		icon: '⚡',
		color: '#fd7e14',
		fieldSchema: fields([
			{ key: 'totalDistance', label: 'Total Distance', type: 'number', unit: 'km', required: true },
			{
				key: 'startType',
				label: 'Start Type',
				type: 'select',
				options: ['RACE', 'ELAPSED-TIME'],
				required: true
			},
			{
				key: 'goalType',
				label: 'Goal Type',
				type: 'select',
				options: ['CYLINDER', 'LINE'],
				required: true
			},
			{ key: 'notes', label: 'Notes', type: 'textarea', required: false }
		])
	});

	// Sample tasks
	const insertTask = db.prepare(`
    INSERT INTO tasks (type_id, name, description, location, data, waypoints, legs)
    VALUES (@typeId, @name, @description, @location, @data, @waypoints, @legs)
  `);

	insertTask.run({
		typeId: sclrResult.lastInsertRowid,
		name: 'Bright SCLR — 9-Leg Circuit',
		description:
			'Classic SCLR task designed for Bright, VIC. 9-leg closed circuit exploiting the ridge dynamics of Mount Buffalo and the Ovens Valley. Suitable for intermediate to advanced pilots.',
		location: 'Bright, VIC, Australia',
		data: JSON.stringify({
			totalDistance: 5.4,
			legCount: 9,
			lapCount: 3,
			startType: 'RACE',
			startTime: '13:00:00',
			goalType: 'CYLINDER',
			earthModel: 'WGS84'
		}),
		waypoints: JSON.stringify([
			{ name: 'WP00', lat: -36.74671, lon: 146.97747, altSmoothed: 890, radius: 50 },
			{ name: 'WP01', lat: -36.7404, lon: 146.9801, altSmoothed: 910, radius: 200 },
			{ name: 'WP02', lat: -36.745, lon: 146.985, altSmoothed: 920, radius: 400 },
			{ name: 'WP03', lat: -36.738, lon: 146.978, altSmoothed: 900, radius: 50 },
			{ name: 'WP04', lat: -36.752, lon: 146.972, altSmoothed: 880, radius: 200 },
			{ name: 'WP05', lat: -36.744, lon: 146.968, altSmoothed: 870, radius: 100 }
		]),
		legs: JSON.stringify([
			{ distance: 600, bearing: 0, radius: 50 },
			{ distance: 600, bearing: -45, radius: 200 },
			{ distance: 600, bearing: 158, radius: 400 },
			{ distance: 600, bearing: 135, radius: 50 },
			{ distance: 600, bearing: -90, radius: 200 },
			{ distance: 600, bearing: 90, radius: 400 },
			{ distance: 600, bearing: -135, radius: 100 },
			{ distance: 600, bearing: -158, radius: 50 },
			{ distance: 600, bearing: 45, radius: 100 }
		])
	});

	insertTask.run({
		typeId: sclrResult.lastInsertRowid,
		name: 'Verbier SCLR — Alpine Demo',
		description:
			'Demonstration SCLR task set around Verbier, Switzerland. Template task used for system testing and pilot briefings.',
		location: 'Verbier, Switzerland',
		data: JSON.stringify({
			totalDistance: 4.8,
			legCount: 9,
			startType: 'RACE',
			startTime: '12:30:00',
			goalType: 'CYLINDER',
			earthModel: 'WGS84'
		}),
		waypoints: JSON.stringify([
			{ name: 'WP00', lat: 46.0972, lon: 7.2301, altSmoothed: 1520, radius: 50 }
		]),
		legs: JSON.stringify([
			{ distance: 600, bearing: 0, radius: 50 },
			{ distance: 600, bearing: -45, radius: 200 },
			{ distance: 600, bearing: 158, radius: 400 }
		])
	});
}
