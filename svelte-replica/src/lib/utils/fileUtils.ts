import type { XCTask, Airspace } from '$lib/types/index.js';
import { validateTask, validateAirspace } from './validators.js';

export async function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('File reading failed'));
		reader.readAsText(file);
	});
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(url);
}

export function parseXCTaskFile(content: string): XCTask {
	try {
		const task = JSON.parse(content);
		if (!task.version || !task.taskType || !Array.isArray(task.turnpoints)) {
			throw new Error('Missing required fields');
		}
		if (task.turnpoints.length < 2) throw new Error('Insufficient turnpoints');
		task.turnpoints.forEach((tp: unknown, i: number) => {
			const t = tp as Record<string, unknown>;
			const wp = t.waypoint as Record<string, unknown> | undefined;
			if (!t.radius || !wp || wp.lat === undefined || wp.lon === undefined) {
				throw new Error(`Invalid turnpoint at index ${i}`);
			}
		});
		return task as XCTask;
	} catch (err) {
		throw new Error(`Failed to parse task file: ${(err as Error).message}`);
	}
}

export function parseOpenAirFile(content: string): Airspace[] {
	const airspaces: Airspace[] = [];
	let current: Partial<Airspace> | null = null;

	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('*')) continue;

		const cmd = trimmed.substring(0, 2);
		const val = trimmed.substring(3).trim();

		switch (cmd) {
			case 'AC':
				if (current && validateAirspace(current as Airspace)) airspaces.push(current as Airspace);
				current = { name: '', class: val, coordinates: [], floor: '', ceiling: '' };
				break;
			case 'AN':
				if (current) current.name = val;
				break;
			case 'AL':
				if (current) current.floor = val;
				break;
			case 'AH':
				if (current) current.ceiling = val;
				break;
			case 'DP':
				if (current) {
					const m = val.match(
						/(\d{2}):(\d{2}):(\d{2})\s*([NS])\s*(\d{2,3}):(\d{2}):(\d{2})\s*([EW])/
					);
					if (m) {
						const lat =
							(parseInt(m[1]) + parseInt(m[2]) / 60 + parseInt(m[3]) / 3600) *
							(m[4] === 'N' ? 1 : -1);
						const lon =
							(parseInt(m[5]) + parseInt(m[6]) / 60 + parseInt(m[7]) / 3600) *
							(m[8] === 'E' ? 1 : -1);
						current.coordinates!.push({ lat, lon, type: 'DP' });
					}
				}
				break;
		}
	}
	if (current && validateAirspace(current as Airspace)) airspaces.push(current as Airspace);
	return airspaces;
}

export function generateXCTaskFile(task: XCTask): string {
	if (!validateTask(task)) throw new Error('Invalid task data');
	return JSON.stringify(task, null, 2);
}

function pad(n: number, w: number): string {
	return String(Math.floor(n)).padStart(w, '0');
}

export function generateOpenAirFile(airspaces: Airspace[]): string {
	return airspaces
		.map((a) => {
			const lines = [
				`AC ${a.class}`,
				`AN ${a.name}`,
				`AL ${a.floor}`,
				`AH ${a.ceiling}`,
				...a.coordinates.map((c) => {
					const latAbs = Math.abs(c.lat);
					const lD = Math.floor(latAbs);
					const lM = Math.floor((latAbs - lD) * 60);
					const lS = Math.round(((latAbs - lD) * 60 - lM) * 60);
					const lonAbs = Math.abs(c.lon);
					const oD = Math.floor(lonAbs);
					const oM = Math.floor((lonAbs - oD) * 60);
					const oS = Math.round(((lonAbs - oD) * 60 - oM) * 60);
					return `DP ${pad(lD, 2)}:${pad(lM, 2)}:${pad(lS, 2)} ${c.lat >= 0 ? 'N' : 'S'} ${pad(oD, 3)}:${pad(oM, 2)}:${pad(oS, 2)} ${c.lon >= 0 ? 'E' : 'W'}`;
				})
			];
			return lines.join('\n');
		})
		.join('\n\n');
}

export function timestampedFilename(base: string, ext: string): string {
	const now = new Date();
	const ts = now
		.toISOString()
		.replace(/[-:T]/g, '')
		.slice(0, 13);
	return `${base}_${ts}.${ext}`;
}
