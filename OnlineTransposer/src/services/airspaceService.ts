/**
 * Service for handling airspace transformations
 * File path: src/services/airspaceService.ts
 */

import { Airspace, AirspaceTransformation } from '../types/airspaceTypes';
import { 
    calculateDistance, 
    calculateBearing, 
    calculateDestination, 
    normalizeBearing 
} from '../utils/coordinateUtils';
import { validateAirspace } from '../utils/validators';

export class AirspaceService {
    /**
     * Transform airspace definitions to new location
     */
    public transformAirspaces(
        airspaces: Airspace[], 
        transformation: AirspaceTransformation
    ): Airspace[] {
        const transformedAirspaces: Airspace[] = [];

        // Calculate the template start to new start vector
        const startPointShift = {
            lat: transformation.newStart.lat - transformation.templateStart.lat,
            lon: transformation.newStart.lon - transformation.templateStart.lon
        };

        for (const airspace of airspaces) {
            if (!validateAirspace(airspace)) {
                console.warn(`Skipping invalid airspace: ${airspace.name}`);
                continue;
            }

            const transformedAirspace: Airspace = {
                name: airspace.name,
                class: airspace.class,
                floor: airspace.floor,
                ceiling: airspace.ceiling,
                coordinates: []
            };

            // Transform each coordinate in the airspace
            for (const coordinate of airspace.coordinates) {
                // Calculate distance and bearing from template start to current coordinate
                const distanceInfo = calculateDistance(
                    transformation.templateStart.lat,
                    transformation.templateStart.lon,
                    coordinate.lat,
                    coordinate.lon
                );

                // Apply rotation to the bearing
                const newBearing = normalizeBearing(distanceInfo.bearing + transformation.rotationAngle);

                // Calculate new position using the rotated bearing and original distance
                const newPosition = calculateDestination(
                    transformation.newStart.lat,
                    transformation.newStart.lon,
                    distanceInfo.meters,
                    newBearing
                );

                transformedAirspace.coordinates.push({
                    lat: newPosition.lat,
                    lon: newPosition.lon,
                    type: 'DP'
                });
            }

            if (validateAirspace(transformedAirspace)) {
                transformedAirspaces.push(transformedAirspace);
            } else {
                throw new Error(`Transformation resulted in invalid airspace: ${airspace.name}`);
            }
        }

        return transformedAirspaces;
    }

    /**
     * Preview airspace transformation without creating full objects
     */
    public previewTransformation(
        airspaces: Airspace[],
        transformation: AirspaceTransformation
    ): Array<Array<{ lat: number; lon: number }>> {
        return airspaces.map(airspace => {
            const coordinates: Array<{ lat: number; lon: number }> = [];
            
            for (const coordinate of airspace.coordinates) {
                const distanceInfo = calculateDistance(
                    transformation.templateStart.lat,
                    transformation.templateStart.lon,
                    coordinate.lat,
                    coordinate.lon
                );

                const newBearing = normalizeBearing(distanceInfo.bearing + transformation.rotationAngle);
                const newPosition = calculateDestination(
                    transformation.newStart.lat,
                    transformation.newStart.lon,
                    distanceInfo.meters,
                    newBearing
                );

                coordinates.push(newPosition);
            }

            return coordinates;
        });
    }
}

export default new AirspaceService();
