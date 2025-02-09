/**
 * Service for handling file uploads and downloads
 * File path: src/services/fileService.ts
 */

import { XCTask } from '../types/taskTypes';
import { Airspace } from '../types/airspaceTypes';
import TaskService from './taskService';
import AirspaceService from './airspaceService';
import {
    readFileAsText,
    downloadFile,
    validateFileType,
    validateFileSize,
    parseXCTaskFile,
    parseOpenAirFile,
    generateXCTaskFile,
    generateOpenAirFile
} from '../utils/fileUtils';

const ACCEPTED_TASK_TYPES = ['.xctsk'];
const ACCEPTED_AIRSPACE_TYPES = ['.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface IFileService {
  parseTaskFile(file: File): Promise<XCTask>;
  parseAirspaceFile(file: File): Promise<Airspace[]>;
  downloadTaskFile(task: XCTask, filename: string): void;
  downloadAirspaceFile(airspaces: Airspace[], filename: string): void;
  validateFiles(files: { task?: File; airspace?: File }): boolean;
}

export class FileService implements IFileService{
    /**
     * Parse an uploaded .xctsk file
     */
    public async parseTaskFile(file: File): Promise<XCTask> {
        try {
            // Validate file before processing
            if (!validateFileType(file, ACCEPTED_TASK_TYPES)) {
                throw new Error('Invalid task file type. Must be .xctsk');
            }
            
            if (!validateFileSize(file)) {
                throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
            }

            // Read and parse file
            const content = await readFileAsText(file);
            const task = parseXCTaskFile(content);

            return task;
        } catch (error) {
            throw new Error(`Failed to parse task file: ${error.message}`);
        }
    }

    /**
     * Parse an uploaded OpenAir format airspace file
     */
    public async parseAirspaceFile(file: File): Promise<Airspace[]> {
        try {
            // Validate file before processing
            if (!validateFileType(file, ACCEPTED_AIRSPACE_TYPES)) {
                throw new Error('Invalid airspace file type. Must be .txt');
            }
            
            if (!validateFileSize(file)) {
                throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
            }

            // Read and parse file
            const content = await readFileAsText(file);
            const airspaces = parseOpenAirFile(content);

            return airspaces;
        } catch (error) {
            throw new Error(`Failed to parse airspace file: ${error.message}`);
        }
    }

    /**
     * Generate and download a transformed task file
     */
    public downloadTaskFile(task: XCTask, filename: string): void {
        try {
            const content = generateXCTaskFile(task);
            const fullFilename = filename.endsWith('.xctsk') ? filename : `${filename}.xctsk`;
            
            downloadFile(
                content, 
                fullFilename,
                'application/json'
            );
        } catch (error) {
            throw new Error(`Failed to generate task file: ${error.message}`);
        }
    }

    /**
     * Generate and download a transformed airspace file
     */
    public downloadAirspaceFile(airspaces: Airspace[], filename: string): void {
        try {
            const content = generateOpenAirFile(airspaces);
            const fullFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
            
            downloadFile(
                content, 
                fullFilename,
                'text/plain'
            );
        } catch (error) {
            throw new Error(`Failed to generate airspace file: ${error.message}`);
        }
    }

    /**
     * Read and prepare all task files for transformation
     */
    public async prepareTaskFiles(taskFile: File, airspaceFile?: File): Promise<{
        task: XCTask;
        airspaces?: Airspace[];
    }> {
        const task = await this.parseTaskFile(taskFile);
        let airspaces: Airspace[] | undefined;

        if (airspaceFile) {
            airspaces = await this.parseAirspaceFile(airspaceFile);
        }

        return { task, airspaces };
    }

    /**
     * Export transformed files
     */
    public exportTransformedFiles(
        task: XCTask,
        airspaces?: Airspace[],
        baseFilename: string = 'transformed'
    ): void {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
        
        // Export task
        this.downloadTaskFile(task, `${baseFilename}_task_${timestamp}.xctsk`);

        // Export airspaces if present
        if (airspaces && airspaces.length > 0) {
            this.downloadAirspaceFile(airspaces, `${baseFilename}_airspace_${timestamp}.txt`);
        }
    }

    /**
     * Validate files before processing
     */
    public validateFiles(files: { task?: File; airspace?: File }): boolean {
        try {
            if (!files.task) {
                throw new Error('Task file is required');
            }

            if (!validateFileType(files.task, ACCEPTED_TASK_TYPES)) {
                throw new Error('Invalid task file type');
            }

            if (files.airspace && !validateFileType(files.airspace, ACCEPTED_AIRSPACE_TYPES)) {
                throw new Error('Invalid airspace file type');
            }

            if (!validateFileSize(files.task) || 
                (files.airspace && !validateFileSize(files.airspace))) {
                throw new Error('File size exceeds limit');
            }

            return true;
        } catch (error) {
            console.error('File validation error:', error);
            return false;
        }
    }
}

//export default new FileService();
