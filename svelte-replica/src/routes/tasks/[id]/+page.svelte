<script lang="ts">
	import { browser } from '$app/environment';
	import TaskFieldRenderer from '$lib/components/TaskFieldRenderer.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	const { task } = data;
	const type = task.type!;

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-AU', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	// Build a minimal XCTask from stored waypoints for map preview
	const mapTask = $derived.by(() => {
		if (!task.waypoints || task.waypoints.length < 2) return null;
		return {
			version: 1,
			taskType: 'CLASSIC' as const,
			earthModel: 'WGS84' as const,
			turnpoints: task.waypoints.map((wp, i) => ({
				radius: wp.radius,
				waypoint: {
					name: wp.name,
					lat: wp.lat,
					lon: wp.lon,
					altSmoothed: wp.altSmoothed
				},
				type: i === 0 ? ('SSS' as const) : i === task.waypoints.length - 1 ? ('ESS' as const) : undefined
			}))
		};
	});
</script>

<svelte:head>
	<title>{task.name} — PGLaps Task Library</title>
</svelte:head>

<!-- Breadcrumb -->
<div class="border-b border-gray-200 bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
		<nav class="flex items-center gap-2 text-sm text-gray-500">
			<a href="/tasks" class="hover:text-primary">Task Library</a>
			<span>›</span>
			<span class="text-gray-900 font-medium truncate">{task.name}</span>
		</nav>
	</div>
</div>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

		<!-- Left: task info -->
		<div class="lg:col-span-2 space-y-6">

			<!-- Header card -->
			<div class="card overflow-hidden">
				<div class="h-2" style="background-color: {type.color}"></div>
				<div class="p-6">
					<div class="flex flex-wrap items-center gap-3 mb-4">
						<span
							class="badge text-white"
							style="background-color: {type.color}"
						>
							{type.icon} {type.name}
						</span>
						{#if task.location}
							<span class="flex items-center gap-1 text-sm text-gray-500">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
								</svg>
								{task.location}
							</span>
						{/if}
					</div>
					<h1 class="text-2xl font-bold text-gray-900 mb-3">{task.name}</h1>
					{#if task.description}
						<p class="text-gray-600 leading-relaxed">{task.description}</p>
					{/if}
					<p class="text-xs text-gray-400 mt-4">Added {formatDate(task.createdAt)}</p>
				</div>
			</div>

			<!-- Task fields (dynamic, driven by type schema) -->
			<div class="card p-6">
				<h2 class="text-base font-semibold text-gray-900 mb-4">Task Parameters</h2>
				<TaskFieldRenderer fieldSchema={type.fieldSchema} data={task.data} mode="view" />
			</div>

			<!-- Legs / waypoints -->
			{#if task.waypoints && task.waypoints.length > 0}
				<div class="card p-6">
					<h2 class="text-base font-semibold text-gray-900 mb-4">
						Waypoints ({task.waypoints.length})
					</h2>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
									<th class="pb-2 pr-4">Name</th>
									<th class="pb-2 pr-4">Latitude</th>
									<th class="pb-2 pr-4">Longitude</th>
									<th class="pb-2 pr-4">Altitude</th>
									<th class="pb-2">Radius</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								{#each task.waypoints as wp}
									<tr class="text-gray-700">
										<td class="py-2 pr-4 font-mono font-semibold text-xs">{wp.name}</td>
										<td class="py-2 pr-4 font-mono text-xs">{wp.lat.toFixed(5)}</td>
										<td class="py-2 pr-4 font-mono text-xs">{wp.lon.toFixed(5)}</td>
										<td class="py-2 pr-4 text-xs">{wp.altSmoothed}m</td>
										<td class="py-2 text-xs">{wp.radius}m</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>

		<!-- Right: sidebar -->
		<div class="space-y-6">

			<!-- Actions -->
			<div class="card p-5">
				<h2 class="text-sm font-semibold text-gray-900 mb-3">Actions</h2>
				<div class="flex flex-col gap-2">
					<a href="/transposer" class="btn-primary text-sm w-full">
						🗺️ Open in Transposer
					</a>
					{#if task.xctskContent}
						<a
							href="data:application/json,{encodeURIComponent(task.xctskContent)}"
							download="{task.name.replace(/\s+/g, '_')}.xctsk"
							class="btn-outline text-sm w-full"
						>
							⬇ Download .xctsk
						</a>
					{/if}
				</div>
			</div>

			<!-- Task type info -->
			<div class="card p-5 border-l-4" style="border-left-color: {type.color}">
				<h2 class="text-sm font-semibold text-gray-900 mb-2">
					{type.icon} {type.name}
				</h2>
				<p class="text-xs text-gray-500 leading-relaxed">{type.description}</p>
				<a href="/tasks?type={type.slug}" class="text-xs font-semibold mt-3 block hover:underline" style="color:{type.color}">
					Browse more {type.name} tasks →
				</a>
			</div>

			<!-- Map preview -->
			{#if mapTask && browser}
				<div class="card overflow-hidden">
					<div class="h-64">
						{#await import('$lib/components/Map.svelte') then { default: Map }}
							<Map
								task={mapTask}
								startLat={task.waypoints[0]?.lat ?? -36.74671}
								startLon={task.waypoints[0]?.lon ?? 146.97747}
								rotation={0}
								readonly={true}
							/>
						{/await}
					</div>
					<p class="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
						Task waypoint preview
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
