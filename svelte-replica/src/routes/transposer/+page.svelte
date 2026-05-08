<script lang="ts">
	import { browser } from '$app/environment';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { notifications } from '$lib/stores/notifications.js';
	import { readFileAsText, parseXCTaskFile, parseOpenAirFile, generateXCTaskFile, generateOpenAirFile, downloadFile, timestampedFilename } from '$lib/utils/fileUtils.js';
	import type { XCTask, Airspace } from '$lib/types/index.js';

	let task = $state<XCTask | null>(null);
	let airspaces = $state<Airspace[]>([]);
	let taskFilename = $state('');
	let airspaceFilename = $state('');
	let startLat = $state(-36.74671);
	let startLon = $state(146.97747);
	let rotation = $state(0);
	let exporting = $state(false);

	async function onTaskFile(file: File) {
		try {
			const text = await readFileAsText(file);
			task = parseXCTaskFile(text);
			taskFilename = file.name;
			// Set start to task's first turnpoint
			if (task.turnpoints.length > 0) {
				startLat = task.turnpoints[0].waypoint.lat;
				startLon = task.turnpoints[0].waypoint.lon;
			}
			notifications.add(`Task loaded: ${task.turnpoints.length} turnpoints`, 'success');
		} catch (err) {
			notifications.add(`Error: ${(err as Error).message}`, 'error');
		}
	}

	async function onAirspaceFile(file: File) {
		try {
			const text = await readFileAsText(file);
			airspaces = parseOpenAirFile(text);
			airspaceFilename = file.name;
			notifications.add(`Airspace loaded: ${airspaces.length} zones`, 'success');
		} catch (err) {
			notifications.add(`Error: ${(err as Error).message}`, 'error');
		}
	}

	async function exportFiles() {
		if (!task) {
			notifications.add('No task loaded', 'error');
			return;
		}
		exporting = true;
		try {
			// Dynamic import to avoid SSR issues
			const { transformTask } = await import('$lib/services/taskService.js');
			const transformed = transformTask(task, { newStartLat: startLat, newStartLon: startLon, rotationAngle: rotation });
			const taskJson = generateXCTaskFile(transformed);
			downloadFile(taskJson, timestampedFilename('TransformedTask', 'xctsk'), 'application/json');

			if (airspaces.length > 0) {
				const { transformAirspaces } = await import('$lib/services/airspaceService.js');
				const { normalizeBearing, calculateBearing } = await import('$lib/utils/coordinateUtils.js');
				const origBearing = calculateBearing(
					task.turnpoints[0].waypoint.lat,
					task.turnpoints[0].waypoint.lon,
					task.turnpoints[1].waypoint.lat,
					task.turnpoints[1].waypoint.lon
				);
				const transformed_as = transformAirspaces(airspaces, {
					templateStart: { lat: task.turnpoints[0].waypoint.lat, lon: task.turnpoints[0].waypoint.lon },
					newStart: { lat: startLat, lon: startLon },
					rotationAngle: normalizeBearing(rotation - origBearing)
				});
				const airspaceTxt = generateOpenAirFile(transformed_as);
				downloadFile(airspaceTxt, timestampedFilename('TransformedAirspaces', 'txt'), 'text/plain');
			}

			notifications.add('Files exported successfully', 'success');
		} catch (err) {
			notifications.add(`Export failed: ${(err as Error).message}`, 'error');
		} finally {
			exporting = false;
		}
	}

	function clearAll() {
		task = null;
		airspaces = [];
		taskFilename = '';
		airspaceFilename = '';
		rotation = 0;
	}

	// Task stats
	let taskStats = $derived.by(() => {
		if (!task) return null;
		return {
			turnpoints: task.turnpoints.length,
			type: task.taskType,
			earthModel: task.earthModel
		};
	});
</script>

<svelte:head>
	<title>Online Transposer — PGLaps</title>
</svelte:head>

<div class="flex flex-col h-[calc(100vh-4rem)]">
	<!-- Map -->
	<div class="flex-1 min-h-0 bg-gray-100">
		{#if browser}
			{#await import('$lib/components/Map.svelte') then { default: Map }}
				<Map
					{task}
					{airspaces}
					bind:startLat
					bind:startLon
					{rotation}
				/>
			{/await}
		{:else}
			<div class="h-full flex items-center justify-center text-gray-400">
				<p>Loading map…</p>
			</div>
		{/if}
	</div>

	<!-- Control panel -->
	<div class="bg-white border-t border-gray-200 shadow-lg">
		<div class="max-w-7xl mx-auto px-4 py-4">
			<div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-end">
				<!-- Task upload -->
				<div>
					<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Task file</p>
					<FileUpload
						accept=".xctsk"
						label="Upload Task (.xctsk)"
						filename={taskFilename}
						onFile={onTaskFile}
					/>
					{#if taskStats}
						<p class="text-xs text-gray-400 mt-1">
							{taskStats.turnpoints} turnpoints · {taskStats.type} · {taskStats.earthModel}
						</p>
					{/if}
				</div>

				<!-- Airspace upload -->
				<div>
					<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Airspace file</p>
					<FileUpload
						accept=".txt"
						label="Upload Airspace (.txt)"
						filename={airspaceFilename}
						onFile={onAirspaceFile}
					/>
					{#if airspaces.length > 0}
						<p class="text-xs text-gray-400 mt-1">{airspaces.length} zones loaded</p>
					{/if}
				</div>

				<!-- Rotation -->
				<div class="min-w-[180px]">
					<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
						Rotation: <span class="text-gray-900 font-bold">{rotation}°</span>
					</p>
					<input
						type="range"
						min="0"
						max="359"
						bind:value={rotation}
						class="w-full accent-primary"
					/>
					<div class="flex justify-between text-xs text-gray-400 mt-0.5">
						<span>0°</span><span>180°</span><span>359°</span>
					</div>
				</div>

				<!-- Coordinates display + actions -->
				<div class="flex flex-col gap-2">
					<div class="text-xs text-gray-500 font-mono">
						{startLat.toFixed(5)}, {startLon.toFixed(5)}
					</div>
					<button
						onclick={exportFiles}
						disabled={!task || exporting}
						class="btn-success whitespace-nowrap"
					>
						{#if exporting}Exporting…{:else}⬇ Export Files{/if}
					</button>
					{#if task}
						<button onclick={clearAll} class="btn-outline text-xs">Clear</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
