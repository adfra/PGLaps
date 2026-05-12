/**
 * Filename generation utilities for exported files
 * File path: src/utils/filenameGenerator.ts
 */

import { XCTask } from '../types/taskTypes';

interface LocationInfo {
    country: string;
    countryCode: string;
    location: string;
}

interface SuggestedFilenames {
    taskFilename: string;
    airspaceFilename: string;
}

/**
 * Parse original filename to extract task type and version
 */
export function parseOriginalFilename(filename: string): { taskType: string; version: string } {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // Split by underscore
    const parts = nameWithoutExt.split('_');

    // Expected format: PGLaps_TaskType_Version_CountryCode-Location
    // parts[0] = "PGLaps"
    // parts[1] = task type (e.g., "Mini", "Microtask")
    // parts[2] = version (e.g., "v01")
    // parts[3] = CountryCode-Location

    const taskType = parts[1] || 'Classic';
    const version = parts[2] || 'v01';

    return { taskType, version };
}

/**
 * Reverse geocode coordinates to get country code
 */
async function reverseGeocode(lat: number, lon: number): Promise<LocationInfo> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
        );

        if (!response.ok) {
            throw new Error('Reverse geocoding failed');
        }

        const data = await response.json();

        // Extract country code and location name from address
        const address = data.address || {};
        const country = address.country || 'Unknown';
        const countryCode = address.country_code ? address.country_code.toUpperCase() : 'XX';

        return {
            country,
            countryCode,
            location: '' // We'll use the search location name instead
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        // Fallback to generic location
        return {
            country: 'Unknown',
            countryCode: 'XX',
            location: ''
        };
    }
}

/**
 * Clean location name to be filesystem-safe
 */
function cleanLocationName(name: string): string {
    return name
        .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .trim();
}

/**
 * Generate suggested filenames based on original filename and deployment location
 */
export async function generateSuggestedFilenames(
    originalFilename: string,
    deploymentLat: number,
    deploymentLon: number,
    searchLocationName?: string
): Promise<SuggestedFilenames> {
    // Parse original filename
    const { taskType, version } = parseOriginalFilename(originalFilename);

    // Reverse geocode to get country code
    const locationInfo = await reverseGeocode(deploymentLat, deploymentLon);

    // Use search location name if available, otherwise use a default
    const location = searchLocationName || 'Location';
    const cleanLocation = cleanLocationName(location);

    const baseFilename = `PGLaps_${taskType}_${version}_${locationInfo.countryCode}-${cleanLocation}`;

    return {
        taskFilename: `${baseFilename}.xctsk`,
        airspaceFilename: `${baseFilename}_Airspace.txt`
    };
}
