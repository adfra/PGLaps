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

// Import map component styles
import './mapComponent.css';


interface MapOptions {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
}

interface CustomMarkerOptions extends L.MarkerOptions {
    originalPosition?: L.LatLng;
}

/**
 * Location search control for Leaflet
 */
class LocationSearchControl extends L.Control {
    private searchInput?: HTMLInputElement;
    private searchButton?: HTMLButtonElement;
    private resultsContainer?: HTMLDivElement;
    private searchTimeout?: number;

    constructor(options?: L.ControlOptions) {
        super(options);
    }

    onAdd(map: L.Map): HTMLElement {
        const container = L.DomUtil.create('div', 'leaflet-control-search leaflet-bar');

        // Prevent map click events from propagating
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        // Create search input
        this.searchInput = L.DomUtil.create('input', '', container) as HTMLInputElement;
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search location...';

        // Create search button
        this.searchButton = L.DomUtil.create('button', '', container) as HTMLButtonElement;
        this.searchButton.textContent = 'Go';
        this.searchButton.type = 'button';

        // Create results dropdown
        this.resultsContainer = L.DomUtil.create('div', 'search-results', container);

        // Set up event listeners
        this.setupEventListeners(map);

        return container;
    }

    private setupEventListeners(map: L.Map): void {
        if (!this.searchInput || !this.searchButton || !this.resultsContainer) return;

        let searchAbortController: AbortController | null = null;

        const performSearch = async (query: string) => {
            if (!query.trim()) {
                this.resultsContainer?.classList.remove('active');
                return;
            }

            // Cancel any pending search
            if (searchAbortController) {
                searchAbortController.abort();
            }

            // Create new abort controller for this search
            searchAbortController = new AbortController();

            // Add loading state
            const container = this.getResultContainer();
            container?.classList.add('search-loading');
            container?.classList.remove('search-error');

            try {
                const results = await this.searchLocation(query, searchAbortController.signal);
                this.displayResults(results, map);
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Search failed:', error);
                    container?.classList.add('search-error');
                }
            } finally {
                container?.classList.remove('search-loading');
                searchAbortController = null;
            }
        };

        // Input event with debounce
        let debounceTimeout: number;
        this.searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = window.setTimeout(() => {
                performSearch(this.searchInput!.value);
            }, 300);
        });

        // Button click
        this.searchButton.addEventListener('click', () => {
            performSearch(this.searchInput!.value);
        });

        // Enter key
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(this.searchInput!.value);
            }
        });

        // Close results when clicking on the map (not other controls)
        const mapContainer = map.getContainer();
        mapContainer.addEventListener('click', (e) => {
            if (!this.getResultContainer()?.contains(e.target as Node)) {
                this.resultsContainer?.classList.remove('active');
            }
        });
    }

    private getResultContainer(): HTMLElement | null {
        return this.searchInput?.closest('.leaflet-control-search') as HTMLElement || null;
    }

    private async searchLocation(query: string, signal: AbortSignal): Promise<Array<{name: string, display_name: string, lat: number, lon: number}>> {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
            { signal }
        );

        if (!response.ok) {
            throw new Error('Search failed');
        }

        return await response.json();
    }

    private displayResults(results: Array<{name: string, display_name: string, lat: number, lon: number}>, map: L.Map): void {
        if (!this.resultsContainer) return;

        this.resultsContainer.innerHTML = '';

        if (results.length === 0) {
            this.resultsContainer.classList.remove('active');
            return;
        }

        results.forEach(result => {
            const item = L.DomUtil.create('div', 'search-result-item', this.resultsContainer!);
            item.innerHTML = `
                <div class="result-name">${result.name}</div>
                <div class="result-details">${result.display_name}</div>
            `;

            L.DomEvent.on(item, 'click', () => {
                map.setView([result.lat, result.lon], 13);
                this.resultsContainer?.classList.remove('active');
                if (this.searchInput) {
                    this.searchInput.value = result.display_name;
                }
            });
        });

        this.resultsContainer.classList.add('active');
    }
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
    private clickMoveTimeout?: number;
    private singleClickTimeout?: number;
    private pendingClickLocation?: L.LatLng;
    private warningControl?: L.Control;
    private warningTimeout?: number;

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
        this.initializeMapClickHandler();
    }

    /**
     * Initialize map layers
     */
    private initializeLayers(): void {
        // Add OpenStreetMap base layer
        this.baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        // Add OpenTopoMap terrain layer (set as default)
        this.terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap contributors',
            maxZoom: 17
        }).addTo(this.map);

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

        // Add location search control
        new LocationSearchControl({ position: 'topleft' }).addTo(this.map);
    }

    /**
     * Initialize map click handler for moving start pin
     * Distinguishes between single click (move pin) and double click (zoom)
     */
    private initializeMapClickHandler(): void {
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            // Don't process click if we just finished a drag (to avoid double-processing)
            if (this.clickMoveTimeout) {
                return;
            }

            // Show warning if no task is loaded
            if (!this.currentTask || !this.dragMarker) {
                this.showWarning('Please load a task first, then left-click to position it');
                return;
            }

            const clickedLat = e.latlng.lat;
            const clickedLon = e.latlng.lng;

            // Store the click location
            this.pendingClickLocation = e.latlng;

            // Clear any existing single-click timeout
            if (this.singleClickTimeout) {
                clearTimeout(this.singleClickTimeout);
            }

            // Set a timeout to execute single-click action if no second click comes
            this.singleClickTimeout = window.setTimeout(() => {
                // This is a single click - move the pin
                if (this.pendingClickLocation) {
                    this.moveStartPinTo(this.pendingClickLocation.lat, this.pendingClickLocation.lng);
                }
                this.singleClickTimeout = undefined;
                this.pendingClickLocation = undefined;
            }, 250); // Wait 250ms to detect if it's a double click
        });

        // Clear single-click timeout on double-click (let Leaflet handle zoom)
        this.map.on('dblclick', () => {
            if (this.singleClickTimeout) {
                clearTimeout(this.singleClickTimeout);
                this.singleClickTimeout = undefined;
            }
            this.pendingClickLocation = undefined;
        });
    }

    /**
     * Move the start pin to a new location and transform the task
     */
    private moveStartPinTo(lat: number, lon: number): void {
        if (!this.currentTask) return;

        try {
            // Calculate current bearing to preserve rotation during move
            const currentBearing = calculateBearing(
                this.currentTask.turnpoints[0].waypoint.lat,
                this.currentTask.turnpoints[0].waypoint.lon,
                this.currentTask.turnpoints[1].waypoint.lat,
                this.currentTask.turnpoints[1].waypoint.lon
            );

            // Transform using current task to preserve previous rotations/position changes
            const transformedTask = TaskService.transformTask(this.currentTask, {
                newStartLat: lat,
                newStartLon: lon,
                rotationAngle: currentBearing
            });

            this.currentTask = transformedTask;

            // Move the marker to new position
            if (this.dragMarker) {
                this.dragMarker.setLatLng(L.latLng(lat, lon));
            }

            this.displayTask(transformedTask);

            if (this.onTaskUpdate) {
                this.onTaskUpdate(transformedTask);
            }
        } catch (error) {
            console.error('Start pin move failed:', error);
        }
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
                this.dragMarker = L.marker(latLng, markerOptions);
                this.setupDragHandlers(this.dragMarker);
                this.taskLayer.addLayer(this.dragMarker);
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
            // Clear any pending click timeout
            if (this.clickMoveTimeout) {
                clearTimeout(this.clickMoveTimeout);
                this.clickMoveTimeout = undefined;
            }
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

                // Fit map to show the entire task after move
                this.fitBoundsToTask();

                // Set timeout to prevent click event from firing immediately after drag
                this.clickMoveTimeout = window.setTimeout(() => {
                    this.clickMoveTimeout = undefined;
                }, 100);

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
     * Fit map bounds to show all task waypoints
     */
    public fitBoundsToTask(): void {
        if (!this.currentTask) return;

        const bounds = L.latLngBounds(
            this.currentTask.turnpoints.map(tp =>
                L.latLng(tp.waypoint.lat, tp.waypoint.lon)
            )
        );

        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    /**
     * Show a temporary warning message on the map
     */
    private showWarning(message: string): void {
        // Clear any existing warning timeout
        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
        }

        // Remove existing warning control if present
        if (this.warningControl) {
            this.map.removeControl(this.warningControl);
        }

        // Create warning control
        const WarningControl = L.Control.extend({
            onAdd: (map: L.Map) => {
                const container = L.DomUtil.create('div', 'map-warning-message');
                container.innerHTML = `
                    <div class="warning-content">
                        <span class="warning-icon">⚠️</span>
                        <span class="warning-text">${message}</span>
                    </div>
                `;
                return container;
            }
        });

        this.warningControl = new WarningControl({ position: 'bottomleft' } as any);
        this.warningControl.addTo(this.map);

        // Auto-hide after 4 seconds
        this.warningTimeout = window.setTimeout(() => {
            if (this.warningControl) {
                this.map.removeControl(this.warningControl);
                this.warningControl = undefined;
            }
            this.warningTimeout = undefined;
        }, 4000);
    }

    /**
     * Clean up map resources
     */
    public destroy(): void {
        // Clear warning timeout
        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
        }

        if (this.map) {
            this.map.remove();
        }
    }
}

export default MapComponent;
