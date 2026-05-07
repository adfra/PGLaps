/**
 * Main map component using Leaflet.js
 * File path: src/components/map/mapComponent.ts
 */

import L from 'leaflet';
import { XCTask, Turnpoint } from '../../types/taskTypes';
import { Airspace } from '../../types/airspaceTypes';
import TaskService from '../../services/taskService';
import { calculateBearing } from '../../utils/coordinateUtils';
import { calculateOptimizedTaskLine } from '../../utils/waypointOptimizer';


interface MapOptions {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
}

interface CustomMarkerOptions extends L.MarkerOptions {
    originalPosition?: L.LatLng;
}

export class MapComponent {
    private map: L.Map;
    private taskLayer?: L.LayerGroup;
    private airspaceLayer?: L.LayerGroup;
    private terrainLayer?: L.TileLayer;
    private baseLayer?: L.TileLayer;
    private currentTask?: XCTask;
    private originalTask?: XCTask;
    private dragMarker?: L.Marker;
    private onTaskUpdate?: (task: XCTask) => void;
    private currentRotation: number = 0;
    private originalTaskBearing?: number;

    constructor(containerId: string, options: MapOptions = {}) {
        const defaultOptions: MapOptions = {
            center: [-36.74671, 146.97747], // Default to Bright, Australia
            zoom: 13,
            minZoom: 5,
            maxZoom: 18
        };

        const mapOptions = { ...defaultOptions, ...options };

        // Initialize map
        this.map = L.map(containerId, {
            center: mapOptions.center,
            zoom: mapOptions.zoom,
            minZoom: mapOptions.minZoom,
            maxZoom: mapOptions.maxZoom
        });

        this.initializeLayers();
        this.initializeControls();
    }

    /**
     * Initialize map layers
     */
    private initializeLayers(): void {
        // Add OpenStreetMap base layer
        this.baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add OpenTopoMap terrain layer
        this.terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap contributors',
            maxZoom: 17
        });

        // Create layers for task and airspace
        this.taskLayer = L.layerGroup().addTo(this.map);
        this.airspaceLayer = L.layerGroup().addTo(this.map);

        // Add layer control
        L.control.layers({
            'OpenStreetMap': this.baseLayer,
            'Terrain': this.terrainLayer
        }, {
            'Task': this.taskLayer,
            'Airspace': this.airspaceLayer
        }).addTo(this.map);
    }

    /**
     * Initialize map controls
     */
    private initializeControls(): void {
        // Add scale control
        L.control.scale({
            imperial: false,
            metric: true
        }).addTo(this.map);
    }

    /**
     * Display task on map
     */
    public displayTask(task: XCTask): void {
        this.currentTask = task;

        // Store original task on first load for transformation reference
        if (!this.originalTask) {
            this.originalTask = JSON.parse(JSON.stringify(task));

            // Store the original bearing
            if (task.turnpoints.length >= 2) {
                const start = task.turnpoints[0].waypoint;
                const next = task.turnpoints[1].waypoint;
                this.originalTaskBearing = calculateBearing(
                    start.lat,
                    start.lon,
                    next.lat,
                    next.lon
                );
                this.currentRotation = this.originalTaskBearing;
            }
        }

        if (!this.taskLayer) return;

        this.taskLayer.clearLayers();

        const turnpoints = task.turnpoints;

        // Draw cylinders (circles) and marker
        turnpoints.forEach((tp, index) => {
            const latLng = L.latLng(tp.waypoint.lat, tp.waypoint.lon);

            const circle = L.circle(latLng, {
                radius: tp.radius,
                color: this.getTurnpointColor(tp),
                fill: false,
                weight: 2
            });

            if (index === 0) {
                const markerOptions: CustomMarkerOptions = {
                    draggable: true,
                    title: tp.waypoint.name
                };
                const marker = L.marker(latLng, markerOptions);
                this.setupDragHandlers(marker);
                this.taskLayer.addLayer(marker);
            }

            this.taskLayer.addLayer(circle);
        });

        // Calculate and draw optimized task line (shortest path between cylinders)
        const optimizedWaypoints = calculateOptimizedTaskLine(turnpoints);
        const optimizedCoordinates = optimizedWaypoints.map(wp =>
            L.latLng(wp.lat, wp.lon)
        );

        const routeLine = L.polyline(optimizedCoordinates, {
            color: 'blue',
            weight: 2,
            opacity: 0.8
        });

        this.taskLayer.addLayer(routeLine);
    }
    /**
     * Display airspace on map
     */
    public displayAirspace(airspaces: Airspace[]): void {
        if (!this.airspaceLayer) return;

        // Clear existing airspace
        this.airspaceLayer.clearLayers();

        airspaces.forEach(airspace => {
            const coordinates = airspace.coordinates.map(coord => 
                L.latLng(coord.lat, coord.lon)
            );

            // Create polygon for airspace
            const polygon = L.polygon(coordinates, {
                color: this.getAirspaceColor(airspace.class),
                fillColor: this.getAirspaceColor(airspace.class),
                fillOpacity: 0.2,
                weight: 2
            });

            // Add popup with airspace info
            polygon.bindPopup(this.createAirspacePopup(airspace));

            this.airspaceLayer.addLayer(polygon);
        });
    }

    /**
     * Set up drag handlers for start point
     */
    private setupDragHandlers(marker: L.Marker): void {
        marker.on('dragstart', () => {
            const pos = marker.getLatLng();
            (marker.options as CustomMarkerOptions).originalPosition = pos;
        });

        marker.on('drag', () => {
            if (!this.taskLayer || !this.currentTask) return;

            const newPos = marker.getLatLng();
            try {
                // Calculate current bearing to preserve rotation during drag
                const currentBearing = calculateBearing(
                    this.currentTask.turnpoints[0].waypoint.lat,
                    this.currentTask.turnpoints[0].waypoint.lon,
                    this.currentTask.turnpoints[1].waypoint.lat,
                    this.currentTask.turnpoints[1].waypoint.lon
                );

                // Transform using current task to preserve previous rotations/position changes
                const previewTask = TaskService.transformTask(this.currentTask, {
                    newStartLat: newPos.lat,
                    newStartLon: newPos.lng,
                    rotationAngle: currentBearing
                });

                this.displayTaskPreview(previewTask);
            } catch (error) {
                console.error('Task preview failed:', error);
            }
        });

        marker.on('dragend', (event) => {
            if (!this.currentTask) return;

            const newPos = marker.getLatLng();
            try {
                // Calculate current bearing to preserve rotation during drag
                const currentBearing = calculateBearing(
                    this.currentTask.turnpoints[0].waypoint.lat,
                    this.currentTask.turnpoints[0].waypoint.lon,
                    this.currentTask.turnpoints[1].waypoint.lat,
                    this.currentTask.turnpoints[1].waypoint.lon
                );

                // Transform using current task to preserve previous rotations/position changes
                const transformedTask = TaskService.transformTask(this.currentTask, {
                    newStartLat: newPos.lat,
                    newStartLon: newPos.lng,
                    rotationAngle: currentBearing
                });

                this.currentTask = transformedTask;
                this.displayTask(transformedTask);

                if (this.onTaskUpdate) {
                    this.onTaskUpdate(transformedTask);
                }
            } catch (error) {
                console.error('Task transformation failed:', error);
                const originalPos = (marker.options as CustomMarkerOptions).originalPosition;
                if (originalPos) {
                    marker.setLatLng(originalPos);
                }
            }
        });
    }
    // Add new method for task preview (doesn't recreate marker to preserve drag)
    private displayTaskPreview(task: XCTask): void {
        if (!this.taskLayer) return;

        // Clear everything except the draggable marker
        this.taskLayer.eachLayer((layer) => {
            if (!(layer instanceof L.Marker)) {
                this.taskLayer!.removeLayer(layer);
            }
        });

        const turnpoints = task.turnpoints;

        // Draw cylinders (circles) for preview
        turnpoints.forEach((tp, index) => {
            const latLng = L.latLng(tp.waypoint.lat, tp.waypoint.lon);

            const circle = L.circle(latLng, {
                radius: tp.radius,
                color: this.getTurnpointColor(tp),
                fill: false,
                weight: 2,
                opacity: 0.6,
                dashArray: '5, 10'
            });

            this.taskLayer.addLayer(circle);
        });

        // Calculate and draw optimized task line for preview
        const optimizedWaypoints = calculateOptimizedTaskLine(turnpoints);
        const optimizedCoordinates = optimizedWaypoints.map(wp =>
            L.latLng(wp.lat, wp.lon)
        );

        const routeLine = L.polyline(optimizedCoordinates, {
            color: 'blue',
            weight: 2,
            opacity: 0.6,
            dashArray: '5, 10'
        });

        this.taskLayer.addLayer(routeLine);
    }

    // Add method to handle rotation updates from UI
    public updateRotation(degrees: number): void {
        this.currentRotation = degrees;
        if (this.currentTask) {
            const start = this.currentTask.turnpoints[0].waypoint;
            const transformedTask = TaskService.transformTask(this.currentTask, {
                newStartLat: start.lat,
                newStartLon: start.lon,
                rotationAngle: degrees
            });
            this.currentTask = transformedTask;
            this.displayTask(transformedTask);
            // Notify app so currentTask stays in sync for export
            this.onTaskUpdate?.(transformedTask);
        }
    }

    /**
     * Calculate rotation angle based on new position
     */
    private calculateRotationAngle(newPos: L.LatLng): number {
        if (!this.currentTask || this.currentTask.turnpoints.length < 2) return 0;

        const oldStart = this.currentTask.turnpoints[0].waypoint;
        const oldNext = this.currentTask.turnpoints[1].waypoint;

        const oldBearing = calculateBearing(
            oldStart.lat,
            oldStart.lon,
            oldNext.lat,
            oldNext.lon
        );

        const newBearing = calculateBearing(
            newPos.lat,
            newPos.lng,
            oldNext.lat,
            oldNext.lon
        );

        return newBearing - oldBearing;
    }

    /**
     * Get color for turnpoint based on type
     */
    private getTurnpointColor(tp: Turnpoint): string {
        switch (tp.type) {
            case 'SSS': return 'green';
            case 'ESS': return 'red';
            default: return 'blue';
        }
    }

    /**
     * Get color for airspace based on class
     */
    private getAirspaceColor(airspaceClass: string): string {
        switch (airspaceClass.toUpperCase()) {
            case 'A': return '#ff0000';
            case 'C': return '#ff6600';
            case 'D': return '#3366ff';
            case 'E': return '#33cc33';
            case 'F': return '#cc33ff';
            case 'G': return '#999999';
            default: return '#666666';
        }
    }

    /**
     * Create popup content for turnpoint
     */
    private createTurnpointPopup(tp: Turnpoint, index: number): string {
        return `
            <div class="turnpoint-popup">
                <h3>${tp.waypoint.name}</h3>
                <p>Type: ${tp.type || 'Turnpoint'}</p>
                <p>Radius: ${tp.radius}m</p>
                <p>Altitude: ${tp.waypoint.altSmoothed}m</p>
                <p>Position: ${tp.waypoint.lat.toFixed(6)}, ${tp.waypoint.lon.toFixed(6)}</p>
            </div>
        `;
    }

    /**
     * Create popup content for airspace
     */
    private createAirspacePopup(airspace: Airspace): string {
        return `
            <div class="airspace-popup">
                <h3>${airspace.name}</h3>
                <p>Class: ${airspace.class}</p>
                <p>Floor: ${airspace.floor}</p>
                <p>Ceiling: ${airspace.ceiling}</p>
            </div>
        `;
    }

    /**
     * Set task update callback
     */
    public setTaskUpdateCallback(callback: (task: XCTask) => void): void {
        this.onTaskUpdate = callback;
    }

    /**
     * Clean up map resources
     */
    public destroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }
}

export default MapComponent;
