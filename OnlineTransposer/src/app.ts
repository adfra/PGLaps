/**
 * Main application entry point
 * File path: src/app.ts
 */

import MapComponent from './components/map/mapComponent';
import FileUploadComponent from './components/fileUpload/fileUploadComponent';
import TaskSelectorComponent from './components/taskSelector/taskSelector';
import TaskService from './services/taskService';
import AirspaceService from './services/airspaceService';
import { FileService } from './services/fileService';
import { XCTask } from './types/taskTypes';
import { Airspace } from './types/airspaceTypes';
import { calculateBearing } from './utils/coordinateUtils';


export class App {
    private map: MapComponent;
    private fileUpload: FileUploadComponent;
    private taskSelector: TaskSelectorComponent;
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
        // Create header (4 columns: instructions, task selector, upload buttons, drop zone)
        const header = document.createElement('div');
        header.className = 'app-header';
        header.id = 'app-header';

        // Create instructions container
        const instructionsContainer = document.createElement('div');
        instructionsContainer.id = 'instructions-container';
        instructionsContainer.className = 'instructions-container';
        instructionsContainer.innerHTML = `
            <div class="instructions-content">
                <strong>Instructions:</strong><br>
                1. Load a task<br>
                2. Search for your location<br>
                3. Click & rotate to position<br>
                4. Export to download files
            </div>
        `;

        const taskSelectorContainer = document.createElement('div');
        taskSelectorContainer.id = 'task-selector-container';
        taskSelectorContainer.className = 'task-selector-container';

        const uploadContainer = document.createElement('div');
        uploadContainer.id = 'upload-container';
        uploadContainer.className = 'upload-container';

        const dropZoneContainer = document.createElement('div');
        dropZoneContainer.id = 'drop-zone-container';
        dropZoneContainer.className = 'drop-zone-container';

        header.appendChild(instructionsContainer);
        header.appendChild(taskSelectorContainer);
        header.appendChild(uploadContainer);
        header.appendChild(dropZoneContainer);

        // Create map container
        const mapContainer = document.createElement('div');
        mapContainer.id = 'map-container';
        mapContainer.className = 'map-container';

        // Create footer (rotation slider, angle display, export button)
        const footer = document.createElement('div');
        footer.className = 'app-footer';

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

        // Create export button
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export';
        exportButton.className = 'export-button';
        exportButton.onclick = () => this.handleExport();

        footer.appendChild(this.rotationControl);
        footer.appendChild(this.departureAngleDisplay);
        footer.appendChild(exportButton);

        // Assemble layout
        this.container.appendChild(header);
        this.container.appendChild(mapContainer);
        this.container.appendChild(footer);

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

        // Initialize task selector
        this.taskSelector = new TaskSelectorComponent('task-selector-container', {
            onTaskLoaded: (task) => this.handleTaskLoaded(task),
            onAirspaceLoaded: (airspace) => this.handleAirspaceLoaded(airspace),
            onError: (error) => this.handleError(error)
        });

        // Initialize file upload (buttons only, drop zone separate)
        this.fileUpload = new FileUploadComponent('upload-container', {
            onTaskLoaded: (task) => this.handleTaskLoaded(task),
            onAirspaceLoaded: (airspace) => this.handleAirspaceLoaded(airspace),
            onError: (error) => this.handleError(error)
        }, 'drop-zone-container');

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
            #pglaps-task-transformer {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .app-header {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 10px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 8px;
                align-items: start;
            }

            .instructions-container {
                min-width: 0;
            }

            .instructions-content {
                background: white;
                border: 2px solid #007bff;
                border-radius: 6px;
                padding: 10px 12px;
                font-size: 13px;
                line-height: 1.5;
                color: #333;
            }

            .task-selector-container {
                min-width: 0;
            }

            .upload-container {
                min-width: 0;
            }

            .drop-zone-container {
                min-width: 0;
            }

            .map-container {
                height: 500px;
                border-radius: 8px;
                overflow: hidden;
            }

            .app-footer {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 8px;
            }

            .rotation-control {
                flex: 1;
                min-width: 120px;
                height: 8px;
                -webkit-appearance: none;
                appearance: none;
                background: #ddd;
                border-radius: 4px;
                outline: none;
            }

            .rotation-control::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                background: #007bff;
                border-radius: 50%;
                cursor: pointer;
            }

            .rotation-control::-moz-range-thumb {
                width: 18px;
                height: 18px;
                background: #007bff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }

            .departure-angle-display {
                width: 48px;
                padding: 6px 8px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                text-align: center;
                font-weight: 600;
                font-size: 14px;
                color: #333;
            }

            .export-button {
                padding: 8px 20px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: background 0.2s;
                white-space: nowrap;
            }

            .export-button:hover {
                background: #218838;
            }

            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                opacity: 0.95;
                transition: opacity 0.3s;
                z-index: 10000;
                max-width: 80vw;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }

            .notification.success {
                background: #28a745;
            }

            .notification.error {
                background: #dc3545;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .app-header {
                    grid-template-columns: 1fr;
                    gap: 8px;
                }

                .map-container {
                    height: 350px;
                }

                .app-footer {
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .rotation-control {
                    flex: 1;
                    min-width: 100px;
                }

                .departure-angle-display {
                    width: 44px;
                    font-size: 13px;
                }

                .export-button {
                    flex: 1;
                    padding: 8px 16px;
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
        if (this.taskSelector) {
            this.taskSelector.destroy();
        }
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
