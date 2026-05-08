<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { XCTask, Airspace } from '$lib/types/index.js';
	import { transformTask } from '$lib/services/taskService.js';
	import { transformAirspaces } from '$lib/services/airspaceService.js';
	import { normalizeBearing } from '$lib/utils/coordinateUtils.js';

	let {
		task = null,
		airspaces = [],
		startLat = $bindable(-36.74671),
		startLon = $bindable(146.97747),
		rotation = 0,
		readonly = false
	}: {
		task?: XCTask | null;
		airspaces?: Airspace[];
		startLat?: number;
		startLon?: number;
		rotation?: number;
		readonly?: boolean;
	} = $props();

	let mapEl: HTMLDivElement;
	let map: import('leaflet').Map | null = null;
	let L: typeof import('leaflet') | null = null;
	let taskLayerGroup: import('leaflet').LayerGroup | null = null;
	let airspaceLayerGroup: import('leaflet').LayerGroup | null = null;
	let startMarker: import('leaflet').Marker | null = null;
	let initialized = $state(false);

	const AIRSPACE_COLORS: Record<string, string> = {
		A: '#ff0000',
		C: '#ff6600',
		D: '#3366ff',
		E: '#33cc33',
		F: '#cc33ff',
		G: '#999999'
	};

	function getAirspaceColor(cls: string): string {
		return AIRSPACE_COLORS[cls.toUpperCase()] ?? '#666666';
	}

	function getTurnpointColor(type: string | undefined): string {
		if (type === 'SSS') return '#28a745';
		if (type === 'ESS') return '#dc3545';
		return '#007bff';
	}

	function renderTask(L: typeof import('leaflet'), displayTask: XCTask) {
		taskLayerGroup?.clearLayers();

		const latlngs = displayTask.turnpoints.map((tp) => [tp.waypoint.lat, tp.waypoint.lon] as [number, number]);

		// Route polyline
		L.polyline(latlngs, { color: '#007bff', weight: 2, opacity: 0.8 }).addTo(taskLayerGroup!);

		// Turnpoint circles and labels
		for (const tp of displayTask.turnpoints) {
			const color = getTurnpointColor(tp.type);
			L.circle([tp.waypoint.lat, tp.waypoint.lon], {
				radius: tp.radius,
				color,
				fillColor: color,
				fillOpacity: 0.12,
				weight: 2
			}).addTo(taskLayerGroup!);

			L.circleMarker([tp.waypoint.lat, tp.waypoint.lon], {
				radius: 5,
				color,
				fillColor: color,
				fillOpacity: 1,
				weight: 2
			})
				.bindTooltip(
					`${tp.waypoint.name}${tp.type ? ` (${tp.type})` : ''}<br>R: ${tp.radius}m`,
					{ permanent: false, direction: 'top' }
				)
				.addTo(taskLayerGroup!);
		}
	}

	function renderAirspaces(L: typeof import('leaflet'), displayed: Airspace[]) {
		airspaceLayerGroup?.clearLayers();
		for (const as of displayed) {
			const color = getAirspaceColor(as.class);
			const latlngs = as.coordinates.map((c) => [c.lat, c.lon] as [number, number]);
			L.polygon(latlngs, {
				color,
				fillColor: color,
				fillOpacity: 0.15,
				weight: 1.5
			})
				.bindTooltip(`${as.name}<br>${as.floor} – ${as.ceiling}`, { sticky: true })
				.addTo(airspaceLayerGroup!);
		}
	}

	function getDisplayedTask(): XCTask | null {
		if (!task) return null;
		try {
			// Find the original first leg bearing
			const origBearing = normalizeBearing(
				Math.atan2(
					task.turnpoints[1].waypoint.lon - task.turnpoints[0].waypoint.lon,
					task.turnpoints[1].waypoint.lat - task.turnpoints[0].waypoint.lat
				) *
					(180 / Math.PI)
			);
			return transformTask(task, { newStartLat: startLat, newStartLon: startLon, rotationAngle: rotation });
		} catch (e) {
			console.warn('Transform failed:', e);
			return null;
		}
	}

	function updateLayers() {
		if (!L || !map || !initialized) return;

		const displayed = getDisplayedTask();
		if (displayed) {
			renderTask(L, displayed);

			if (airspaces.length > 0) {
				try {
					const templateStart = task!.turnpoints[0].waypoint;
					const origBearing = normalizeBearing(
						Math.atan2(
							task!.turnpoints[1].waypoint.lon - templateStart.lon,
							task!.turnpoints[1].waypoint.lat - templateStart.lat
						) *
							(180 / Math.PI)
					);
					const transformed = transformAirspaces(airspaces, {
						templateStart: { lat: templateStart.lat, lon: templateStart.lon },
						newStart: { lat: startLat, lon: startLon },
						rotationAngle: rotation - origBearing
					});
					renderAirspaces(L, transformed);
				} catch (e) {
					console.warn('Airspace transform failed:', e);
				}
			} else {
				airspaceLayerGroup?.clearLayers();
			}
		} else {
			taskLayerGroup?.clearLayers();
			airspaceLayerGroup?.clearLayers();
		}

		// Update marker position
		startMarker?.setLatLng([startLat, startLon]);
	}

	onMount(async () => {
		L = (await import('leaflet')).default;

		// Fix default marker icon paths in bundled apps
		(L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'] = undefined;
		L.Icon.Default.mergeOptions({
			iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
			iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
			shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
		});

		map = L.map(mapEl).setView([startLat, startLon], 13);

		// Base layers
		const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap contributors'
		});
		const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
			maxZoom: 17,
			attribution: '© OpenTopoMap'
		});
		osm.addTo(map);

		// Layer groups
		taskLayerGroup = L.layerGroup().addTo(map);
		airspaceLayerGroup = L.layerGroup().addTo(map);

		L.control
			.layers(
				{ OpenStreetMap: osm, Terrain: topo },
				{ Task: taskLayerGroup, Airspace: airspaceLayerGroup }
			)
			.addTo(map);

		L.control.scale({ imperial: false }).addTo(map);

		// Draggable start marker
		if (!readonly) {
			const icon = L.divIcon({
				html: `<div style="width:16px;height:16px;background:#007bff;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
				iconSize: [16, 16],
				iconAnchor: [8, 8],
				className: ''
			});

			startMarker = L.marker([startLat, startLon], { icon, draggable: true })
				.addTo(map)
				.bindTooltip('Drag to reposition task', { permanent: false });

			startMarker.on('dragend', () => {
				const ll = startMarker!.getLatLng();
				startLat = ll.lat;
				startLon = ll.lng;
			});

			startMarker.on('drag', () => {
				const ll = startMarker!.getLatLng();
				startLat = ll.lat;
				startLon = ll.lng;
			});
		}

		initialized = true;
		updateLayers();
	});

	onDestroy(() => {
		map?.remove();
	});

	// React to prop changes
	$effect(() => {
		// Depend on all reactive inputs
		void task;
		void airspaces;
		void startLat;
		void startLon;
		void rotation;
		updateLayers();
	});
</script>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<div bind:this={mapEl} class="h-full w-full rounded-lg overflow-hidden"></div>
