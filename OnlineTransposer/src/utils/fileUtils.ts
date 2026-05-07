/**
 * Utility functions for file handling
 * File path: src/utils/fileUtils.ts
 */

import { XCTask, TaskType, EarthModel } from '../types/taskTypes';
import { Airspace } from '../types/airspaceTypes';
import { validateTask, validateAirspace } from './validators';

const ACCEPTED_TASK_TYPES = ['.xctsk'];
const ACCEPTED_AIRSPACE_TYPES = ['.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Read a file and return its contents as text
 */
export async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsText(file);
    });
}

/**
 * Create and trigger a file download
 */
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

/**
 * Validate file type against accepted types
 */
export function validateFileType(file: File, acceptedTypes: string[]): boolean {
    const fileName = file.name.toLowerCase();
    return acceptedTypes.some(type => fileName.endsWith(type));
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeBytes: number = MAX_FILE_SIZE): boolean {
    return file.size <= maxSizeBytes;
}

/**
 * Parse XCTSK file content into structured task data
 */
export function parseXCTaskFile(content: string): XCTask {
    try {
        const taskData = JSON.parse(content);
        
        // Validate required fields
        if (!taskData.version || !taskData.taskType || !taskData.turnpoints) {
            throw new Error('Invalid task file format: missing required fields');
        }

        // Validate turnpoints
        if (!Array.isArray(taskData.turnpoints) || taskData.turnpoints.length < 2) {
            throw new Error('Invalid task file format: insufficient turnpoints');
        }

        // Validate each turnpoint has required fields
        taskData.turnpoints.forEach((tp: any, index: number) => {
            if (!tp.radius || !tp.waypoint || !tp.waypoint.lat || !tp.waypoint.lon) {
                throw new Error(`Invalid turnpoint format at index ${index}`);
            }
        });

        if (!validateTask(taskData)) {
            throw new Error('Task validation failed');
        }

        return taskData;
    } catch (error) {
        throw new Error(`Failed to parse task file: ${error.message}`);
    }
}

/**
 * Parse OpenAir format airspace file
 */
export function parseOpenAirFile(content: string): Airspace[] {
    const airspaces: Airspace[] = [];
    let currentAirspace: Partial<Airspace> | null = null;
    
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('*')) continue;

        const command = trimmedLine.substring(0, 2);
        const value = trimmedLine.substring(3).trim();

        switch (command) {
            case 'AC':
                // Start new airspace
                if (currentAirspace) {
                    if (validateAirspace(currentAirspace as Airspace)) {
                        airspaces.push(currentAirspace as Airspace);
                    }
                }
                currentAirspace = {
                    name: '',
                    class: value,
                    coordinates: [],
                    floor: '',
                    ceiling: ''
                };
                break;
            case 'AN':
                if (currentAirspace) currentAirspace.name = value;
                break;
            case 'AL':
                if (currentAirspace) currentAirspace.floor = value;
                break;
            case 'AH':
                if (currentAirspace) currentAirspace.ceiling = value;
                break;
            case 'DP':
                if (currentAirspace) {
                    // Parse coordinate string (format: 46:24:15 N 008:12:45 E)
                    const match = value.match(/(\d{2}):(\d{2}):(\d{2})\s*([NS])\s*(\d{2,3}):(\d{2}):(\d{2})\s*([EW])/);
                    if (match) {
                        const [_, latDeg, latMin, latSec, latDir, lonDeg, lonMin, lonSec, lonDir] = match;
                        const lat = (parseInt(latDeg) + parseInt(latMin)/60 + parseInt(latSec)/3600) * (latDir === 'N' ? 1 : -1);
                        const lon = (parseInt(lonDeg) + parseInt(lonMin)/60 + parseInt(lonSec)/3600) * (lonDir === 'E' ? 1 : -1);
                        currentAirspace.coordinates.push({
                          lat,
                          lon,
                          type: 'DP'
                        });
                    }
                }
                break;
        }
    }

    // Add last airspace if exists
    if (currentAirspace && validateAirspace(currentAirspace as Airspace)) {
        airspaces.push(currentAirspace as Airspace);
    }

    return airspaces;
}

/**
 * Generate XCTSK file content from task data
 */
export function generateXCTaskFile(task: XCTask): string {
    if (!validateTask(task)) {
        throw new Error('Invalid task data');
    }
    return JSON.stringify(task, null, 2);
}

/**
 * Generate OpenAir format file from airspace data
 */

function padNumber(num: number, width: number): string {
    return String(Math.floor(num)).padStart(width, '0');
}

export function generateOpenAirFile(airspaces: Airspace[]): string {
    return airspaces.map(airspace => {
        const lines = [
            `AC ${airspace.class}`,
            `AN ${airspace.name}`,
            `AL ${airspace.floor}`,
            `AH ${airspace.ceiling}`,
            ...airspace.coordinates.map(coord => {
                const latDeg = Math.floor(Math.abs(coord.lat));
                const latMin = Math.floor((Math.abs(coord.lat) - latDeg) * 60);
                const latSec = Math.round(((Math.abs(coord.lat) - latDeg) * 60 - latMin) * 60);
                const latDir = coord.lat >= 0 ? 'N' : 'S';

                const lonDeg = Math.floor(Math.abs(coord.lon));
                const lonMin = Math.floor((Math.abs(coord.lon) - lonDeg) * 60);
                const lonSec = Math.round(((Math.abs(coord.lon) - lonDeg) * 60 - lonMin) * 60);
                const lonDir = coord.lon >= 0 ? 'E' : 'W';

              return `DP ${padNumber(latDeg, 2)}:${padNumber(latMin, 2)}:${padNumber(latSec, 2)} ${latDir} ${padNumber(lonDeg, 3)}:${padNumber(lonMin, 2)}:${padNumber(lonSec, 2)} ${lonDir}`;
            })
        ];
        return lines.join('\n');
    }).join('\n\n');
}
