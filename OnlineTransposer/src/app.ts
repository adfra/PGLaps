/**
 * Main application entry point
 * File path: src/app.ts
 */

import MapComponent from './components/map/mapComponent';
import FileUploadComponent from './components/fileUpload/fileUploadComponent';
import TaskService from './services/taskService';
import AirspaceService from './services/airspaceService';
import { FileService } from './services/fileService';
import { XCTask } from './types/taskTypes';
import { Airspace } from './types/airspaceTypes';
import { calculateBearing } from './utils/coordinateUtils';


export class App {
    private map: MapComponent;
    private fileUpload: FileUploadComponent;
    private currentTask?: XCTask;
    private currentAirspace?: Airspace[];
    private container: HTMLElement;
    private rotationControl: HTMLInputElement;
    private fileService: FileService;

    constructor(containerId: string) {
        // Get container element
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element ${containerId} not found`);
        }
        this.container = container;
        
        // Create application layout
        this.createLayout();
        
        // Initialize components
        this.initializeComponents();
        
        // Add event listeners
      this.setupEventListeners();

      // Initialize file service
      this.fileService = new FileService();
    }

    /**
     * Create application layout
     */
    private createLayout(): void {
        // Create main containers
        const mapContainer = document.createElement('div');
        mapContainer.id = 'map-container';
        mapContainer.className = 'map-container';

        const controlContainer = document.createElement('div');
        controlContainer.className = 'control-container';

        const uploadContainer = document.createElement('div');
        uploadContainer.id = 'upload-container';
        uploadContainer.className = 'upload-container';

        const rotationContainer = document.createElement('div');
        rotationContainer.className = 'rotation-container';

        // Create rotation control
        this.rotationControl = document.createElement('input');
        this.rotationControl.type = 'range';
        this.rotationControl.min = '0';
        this.rotationControl.max = '359';
        this.rotationControl.value = '0';
        this.rotationControl.className = 'rotation-control';

        const rotationLabel = document.createElement('label');
        rotationLabel.textContent = 'Task Rotation: ';
        rotationLabel.appendChild(this.rotationControl);
        rotationContainer.appendChild(rotationLabel);

        // Create export button
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export Files';
        exportButton.className = 'export-button';
        exportButton.onclick = () => this.handleExport();

        // Assemble layout
        controlContainer.appendChild(uploadContainer);
        controlContainer.appendChild(rotationContainer);
        controlContainer.appendChild(exportButton);

        this.container.appendChild(mapContainer);
        this.container.appendChild(controlContainer);

        // Add styles
        this.addStyles();
    }

    /**
     * Initialize components
     */
    private initializeComponents(): void {
        // Initialize map
        this.map = new MapComponent('map-container', {
            center: [-36.74671, 146.97747], // Default to Bright, Australia
            zoom: 13
        });

        // Initialize file upload
        this.fileUpload = new FileUploadComponent('upload-container', {
            onTaskLoaded: (task) => this.handleTaskLoaded(task),
            onAirspaceLoaded: (airspace) => this.handleAirspaceLoaded(airspace),
            onError: (error) => this.handleError(error)
        });

        // Set up task update callback
        this.map.setTaskUpdateCallback((task) => this.handleTaskUpdate(task));
    }

    /**
     * Set up event listeners
     */
     private setupEventListeners(): void {
        // Handle rotation control changes
        this.rotationControl.addEventListener('input', (e) => {
            const rotation = parseFloat((e.target as HTMLInputElement).value);
            this.handleTaskRotation(rotation);
        });
    }

    /**
     * Handle task file loading
     */
    private handleTaskLoaded(task: XCTask): void {
        this.currentTask = task;
        this.map.displayTask(task);
        // Determine initial rotationControl.Value
        const oldFirstLegBearing = calculateBearing(
            task.turnpoints[0].waypoint.lat,
            task.turnpoints[0].waypoint.lon,
            task.turnpoints[1].waypoint.lat,
            task.turnpoints[1].waypoint.lon
        );

        // Reset rotation control and store initial state
        this.rotationControl.value = oldFirstLegBearing.toString();
        // If airspace is already loaded, ensure it's properly aligned
        if (this.currentAirspace) {
            this.syncAirspaceWithTask(0);
        }
        this.showNotification('Task loaded successfully');
    }

    /**
     * Handle airspace file loading
     */
    private handleAirspaceLoaded(airspace: Airspace[]): void {
        this.currentAirspace = airspace;
        // If task is already loaded, ensure airspace is properly aligned
        if (this.currentTask) {
            this.syncAirspaceWithTask(parseFloat(this.rotationControl.value));
        } else {
            this.map.displayAirspace(airspace);
        }
        this.showNotification('Airspace loaded successfully');
    }

    private syncAirspaceWithTask(rotation: number): void {
        if (!this.currentTask || !this.currentAirspace) return;

        const airspaceTransformation = {
            templateStart: {
                lat: this.currentTask.turnpoints[0].waypoint.lat,
                lon: this.currentTask.turnpoints[0].waypoint.lon
            },
            newStart: {
                lat: this.currentTask.turnpoints[0].waypoint.lat,
                lon: this.currentTask.turnpoints[0].waypoint.lon
            },
            rotationAngle: rotation
        };
        
        const transformedAirspace = AirspaceService.transformAirspaces(
            this.currentAirspace,
            airspaceTransformation
        );
        
        this.map.displayAirspace(transformedAirspace);
    }

    /**
     * Handle task updates from map interactions
     */
    private handleTaskUpdate(task: XCTask): void {
        this.currentTask = task;
        if (this.currentAirspace) {
            const transformation = {
                templateStart: {
                    lat: task.turnpoints[0].waypoint.lat,
                    lon: task.turnpoints[0].waypoint.lon
                },
                newStart: {
                    lat: task.turnpoints[0].waypoint.lat,
                    lon: task.turnpoints[0].waypoint.lon
                },
                rotationAngle: parseFloat(this.rotationControl.value)
            };
            
            const transformedAirspace = AirspaceService.transformAirspaces(
                this.currentAirspace,
                transformation
            );
            this.map.displayAirspace(transformedAirspace);
        }
    }

    /**
     * Handle task rotation
     */
    private handleTaskRotation(rotation: number): void {
        if (!this.currentTask) return;

        try {
            // Transform task
            const transformation = {
                newStartLat: this.currentTask.turnpoints[0].waypoint.lat,
                newStartLon: this.currentTask.turnpoints[0].waypoint.lon,
                rotationAngle: rotation
            };

            const transformedTask = TaskService.transformTask(
                this.currentTask,
                transformation
            );

            // Update task display
            this.map.displayTask(transformedTask);

            // Sync airspace with new task rotation
            if (this.currentAirspace) {
                this.syncAirspaceWithTask(rotation);
            }
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Handle file export
     */
    private handleExport(): void {
        if (!this.currentTask) {
            this.showNotification('No task to export', 'error');
            return;
        }

      try {
            
            this.fileService.exportTransformedFiles(
                this.currentTask,
                this.currentAirspace
            );
            this.showNotification('Files exported successfully');
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Handle errors
     */
    private handleError(error: Error): void {
        console.error('Application error:', error);
        this.showNotification(error.message, 'error');
    }

    /**
     * Show notification to user
     */
    private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.container.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    /**
     * Add application styles
     */
    private addStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .map-container {
                height: 70vh;
                margin-bottom: 20px;
            }

            .control-container {
                padding: 20px;
                background: #f5f5f5;
                border-radius: 8px;
            }

            .rotation-container {
                margin: 20px 0;
            }

            .rotation-control {
                width: 100%;
            }

            .export-button {
                display: block;
                width: 100%;
                padding: 10px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.3s;
            }

            .export-button:hover {
                background: #218838;
            }

            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 4px;
                color: white;
                opacity: 0.9;
                transition: opacity 0.3s;
            }

            .notification.success {
                background: #28a745;
            }

            .notification.error {
                background: #dc3545;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        this.map.destroy();
        this.fileUpload.destroy();
        this.container.innerHTML = '';
    }
}

// Initialize app when loaded in WordPress
window.addEventListener('load', () => {
    const app = new App('pglaps-task-transformer');
});

declare global {
    interface Window {
        App: typeof App;
    }
}

window.App = App;
