/**
 * Service for handling airspace transformations
 * File path: src/services/airspaceService.ts
 */

import { Airspace, AirspaceTransformation, Coordinate } from '../types/airspaceTypes';
import { TransformationMatrix } from '../types/geometryTypes';
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
                const distance = calculateDistance(
                    transformation.templateStart.lat,
                    transformation.templateStart.lon,
                    coordinate.lat,
                    coordinate.lon
                );

                // Apply rotation to the bearing
                const newBearing = normalizeBearing(distance.bearing + transformation.rotationAngle);

                // Calculate new position
                const newPosition = calculateDestination(
                    transformation.newStart.lat,
                    transformation.newStart.lon,
                    distance.meters,
                    newBearing
                );

                transformedAirspace.coordinates.push({
                    lat: newPosition.lat,
                    lon: newPosition.lon,
                  type: 'DP' // TODO: Verify the type of coordinate is correct.
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
     * Calculate transformation matrix from template to new location
     */
    private calculateTransformation(
        transformation: AirspaceTransformation
    ): TransformationMatrix {
        const translation = {
            lat: transformation.newStart.lat - transformation.templateStart.lat,
            lon: transformation.newStart.lon - transformation.templateStart.lon
        };

        return {
            translation,
            rotation: transformation.rotationAngle,
            scale: 1 // We maintain 1:1 scale for airspace transformations
        };
    }

    /**
     * Calculate bounding box for airspace
     */
    private calculateBoundingBox(airspace: Airspace) {
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLon = Infinity;
        let maxLon = -Infinity;

        for (const coord of airspace.coordinates) {
            minLat = Math.min(minLat, coord.lat);
            maxLat = Math.max(maxLat, coord.lat);
            minLon = Math.min(minLon, coord.lon);
            maxLon = Math.max(maxLon, coord.lon);
        }

        return {
            north: maxLat,
            south: minLat,
            east: maxLon,
            west: minLon
        };
    }

    /**
     * Check if two airspaces overlap
     */
    private checkAirspaceOverlap(airspace1: Airspace, airspace2: Airspace): boolean {
        // First quick check using bounding boxes
        const box1 = this.calculateBoundingBox(airspace1);
        const box2 = this.calculateBoundingBox(airspace2);

        if (box1.north < box2.south || box1.south > box2.north ||
            box1.east < box2.west || box1.west > box2.east) {
            return false;
        }

        // For more precise checking, we could implement polygon intersection
        // but bounding box is sufficient for most cases
        return true;
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
                const distance = calculateDistance(
                    transformation.templateStart.lat,
                    transformation.templateStart.lon,
                    coordinate.lat,
                    coordinate.lon
                );

                const newBearing = normalizeBearing(distance.bearing + transformation.rotationAngle);
                const newPosition = calculateDestination(
                    transformation.newStart.lat,
                    transformation.newStart.lon,
                    distance.meters,
                    newBearing
                );

                coordinates.push(newPosition);
            }

            return coordinates;
        });
    }

    /**
     * Validate airspace transformation result
     */
    public validateTransformation(
        originalAirspaces: Airspace[],
        transformedAirspaces: Airspace[]
    ): boolean {
        // Check counts match
        if (originalAirspaces.length !== transformedAirspaces.length) {
            return false;
        }

        // Check each transformed airspace
        for (let i = 0; i < transformedAirspaces.length; i++) {
            const original = originalAirspaces[i];
            const transformed = transformedAirspaces[i];

            // Check coordinate counts match
            if (original.coordinates.length !== transformed.coordinates.length) {
                return false;
            }

            // Verify properties are preserved
            if (original.name !== transformed.name ||
                original.class !== transformed.class ||
                original.floor !== transformed.floor ||
                original.ceiling !== transformed.ceiling) {
                return false;
            }

            // Validate the transformed airspace
            if (!validateAirspace(transformed)) {
                return false;
            }
        }

        return true;
    }
}

export default new AirspaceService();
