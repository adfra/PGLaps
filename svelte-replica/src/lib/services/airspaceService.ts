import type { Airspace, AirspaceTransformation } from '$lib/types/index.js';
import {
	calculateDistance,
	calculateDestination,
	normalizeBearing
} from '$lib/utils/coordinateUtils.js';
import { validateAirspace } from '$lib/utils/validators.js';

export function transformAirspaces(
	airspaces: Airspace[],
	transformation: AirspaceTransformation
): Airspace[] {
	const results: Airspace[] = [];

	for (const airspace of airspaces) {
		if (!validateAirspace(airspace)) {
			console.warn(`Skipping invalid airspace: ${airspace.name}`);
			continue;
		}

		const transformed: Airspace = {
			name: airspace.name,
			class: airspace.class,
			floor: airspace.floor,
			ceiling: airspace.ceiling,
			coordinates: airspace.coordinates.map((coord) => {
				const { meters, bearing } = calculateDistance(
					transformation.templateStart.lat,
					transformation.templateStart.lon,
					coord.lat,
					coord.lon
				);
				const newBearing = normalizeBearing(bearing + transformation.rotationAngle);
				const pos = calculateDestination(
					transformation.newStart.lat,
					transformation.newStart.lon,
					meters,
					newBearing
				);
				return { ...coord, lat: pos.lat, lon: pos.lon };
			})
		};

		if (!validateAirspace(transformed)) {
			throw new Error(`Transformation produced invalid airspace: ${airspace.name}`);
		}
		results.push(transformed);
	}

	return results;
}
