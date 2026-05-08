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
    private originalAirspace?: Airspace[];
    private originalTaskStart?: { lat: number; lon: number };
    private originalTaskBearing?: number;
    private container: HTMLElement;
    private rotationControl: HTMLInputElement;
    private departureAngleDisplay: HTMLInputElement;
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

        // Create departure angle display (read-only)
        this.departureAngleDisplay = document.createElement('input');
        this.departureAngleDisplay.type = 'text';
        this.departureAngleDisplay.readOnly = true;
        this.departureAngleDisplay.value = '0°';
        this.departureAngleDisplay.className = 'departure-angle-display';

        const rotationLabel = document.createElement('label');
        rotationLabel.className = 'rotation-label';
        rotationLabel.textContent = 'Task Rotation: ';
        rotationLabel.appendChild(this.rotationControl);

        rotationContainer.appendChild(rotationLabel);
        rotationContainer.appendChild(this.departureAngleDisplay);

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
     * Handle task file loading
     */
    private handleTaskLoaded(task: XCTask): void {
        this.currentTask = task;

        // Store original task state for transformations
        this.originalTaskStart = {
            lat: task.turnpoints[0].waypoint.lat,
            lon: task.turnpoints[0].waypoint.lon
        };
        this.originalTaskBearing = calculateBearing(
            task.turnpoints[0].waypoint.lat,
            task.turnpoints[0].waypoint.lon,
            task.turnpoints[1].waypoint.lat,
            task.turnpoints[1].waypoint.lon
        );

        this.map.displayTask(task);

        // Fit map to show the entire task
        this.map.fitBoundsToTask();

        // Reset rotation control to original bearing
        this.rotationControl.value = this.originalTaskBearing.toString();
        this.departureAngleDisplay.value = `${Math.round(this.originalTaskBearing)}°`;

        // If airspace is already loaded, ensure it's properly aligned
        if (this.currentAirspace) {
            this.syncAirspaceWithTask(this.originalTaskBearing);
        }
        this.showNotification('Task loaded successfully');
    }

    /**
     * Handle airspace file loading
     */
    private handleAirspaceLoaded(airspace: Airspace[]): void {
        // Store the original airspace template for transformations
        this.originalAirspace = JSON.parse(JSON.stringify(airspace));
        this.currentAirspace = airspace;
        // If task is already loaded, ensure airspace is properly aligned
        if (this.currentTask) {
            this.syncAirspaceWithTask(parseFloat(this.rotationControl.value));
        } else {
            this.map.displayAirspace(airspace);
        }
        this.showNotification('Airspace loaded successfully');
    }

    private syncAirspaceWithTask(targetBearing: number): void {
        if (!this.currentTask || !this.originalAirspace || !this.originalTaskStart || this.originalTaskBearing === undefined) return;

        // Calculate relative rotation (difference from original bearing)
        const relativeRotation = targetBearing - this.originalTaskBearing;

        const airspaceTransformation = {
            templateStart: this.originalTaskStart,
            newStart: {
                lat: this.currentTask.turnpoints[0].waypoint.lat,
                lon: this.currentTask.turnpoints[0].waypoint.lon
            },
            rotationAngle: relativeRotation
        };

        // Always transform from the original airspace template
        const transformedAirspace = AirspaceService.transformAirspaces(
            this.originalAirspace,
            airspaceTransformation
        );

        // Store the transformed airspace for export
        this.currentAirspace = transformedAirspace;

        this.map.displayAirspace(transformedAirspace);
    }

    /**
     * Handle task updates from map interactions
     */
    private handleTaskUpdate(task: XCTask): void {
        this.currentTask = task;
        // Keep rotation slider in sync with actual first-leg bearing
        if (task.turnpoints.length >= 2) {
            const bearing = calculateBearing(
                task.turnpoints[0].waypoint.lat,
                task.turnpoints[0].waypoint.lon,
                task.turnpoints[1].waypoint.lat,
                task.turnpoints[1].waypoint.lon
            );
            this.rotationControl.value = bearing.toString();
            this.departureAngleDisplay.value = `${Math.round(bearing)}°`;
        }
        if (this.currentAirspace && this.originalTaskStart && this.originalTaskBearing !== undefined) {
            const targetBearing = parseFloat(this.rotationControl.value);
            const relativeRotation = targetBearing - this.originalTaskBearing;

            const transformation = {
                templateStart: this.originalTaskStart,
                newStart: {
                    lat: task.turnpoints[0].waypoint.lat,
                    lon: task.turnpoints[0].waypoint.lon
                },
                rotationAngle: relativeRotation
            };

            const transformedAirspace = AirspaceService.transformAirspaces(
                this.originalAirspace,
                transformation
            );
            this.currentAirspace = transformedAirspace;
            this.map.displayAirspace(transformedAirspace);
        }
    }

    /**
     * Handle task rotation
     */
    private handleTaskRotation(rotation: number): void {
        if (!this.currentTask) return;

        try {
            this.map.updateRotation(rotation);
            this.departureAngleDisplay.value = `${Math.round(rotation)}°`;

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
                height: 500px;
                margin-bottom: 10px;
            }

            .control-container {
                padding: 10px;
                background: #f5f5f5;
                border-radius: 8px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: center;
            }

            .upload-container {
                flex: 1;
                min-width: 250px;
            }

            .rotation-container {
                flex: 0 0 auto;
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .rotation-label {
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            }

            .rotation-control {
                width: 100px;
            }

            .departure-angle-display {
                width: 50px;
                padding: 4px 6px;
                background: #e9ecef;
                border: 1px solid #ced4da;
                border-radius: 4px;
                text-align: center;
                font-weight: bold;
                flex-shrink: 0;
            }

            .export-button {
                padding: 10px 20px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.3s;
                white-space: nowrap;
                flex-shrink: 0;
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
                z-index: 10000;
                max-width: 80vw;
            }

            .notification.success {
                background: #28a745;
            }

            .notification.error {
                background: #dc3545;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .map-container {
                    height: 400px;
                }

                .control-container {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 8px;
                }

                .upload-container {
                    min-width: 100%;
                }

                .rotation-container {
                    width: 100%;
                    justify-content: space-between;
                }

                .rotation-label {
                    flex: 1;
                }

                .rotation-control {
                    flex: 1;
                    min-width: 80px;
                }

                .departure-angle-display {
                    width: 50px;
                }

                .export-button {
                    width: 100%;
                }

                .notification {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    private setupEventListeners(): void {
        this.rotationControl.addEventListener('input', (e) => {
            const rotation = parseFloat((e.target as HTMLInputElement).value);
            this.handleTaskRotation(rotation);
        });
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
