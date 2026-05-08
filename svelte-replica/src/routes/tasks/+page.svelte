<script lang="ts">
	import type { PageData } from './$types.js';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let search = $state(data.search);

	function onTypeChange(slug: string | null) {
		const params = new URLSearchParams($page.url.searchParams);
		if (slug) params.set('type', slug);
		else params.delete('type');
		params.delete('q');
		goto(`/tasks?${params}`);
	}

	function onSearch(e: SubmitEvent) {
		e.preventDefault();
		const params = new URLSearchParams($page.url.searchParams);
		if (search.trim()) params.set('q', search.trim());
		else params.delete('q');
		goto(`/tasks?${params}`);
	}
</script>

<svelte:head>
	<title>Task Library — PGLaps</title>
</svelte:head>

<!-- Header -->
<div class="bg-gray-50 border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-1">Task Library</h1>
		<p class="text-gray-500 text-sm">
			{data.tasks.length} task{data.tasks.length !== 1 ? 's' : ''} available
			{#if data.activeType} · filtered by <strong>{data.activeType}</strong>{/if}
		</p>
	</div>
</div>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<div class="flex flex-col lg:flex-row gap-6">

		<!-- Sidebar: task type filter -->
		<aside class="w-full lg:w-56 flex-shrink-0">
			<div class="card p-4">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Task Type</p>
				<nav class="flex flex-col gap-1">
					<button
						onclick={() => onTypeChange(null)}
						class="text-left px-3 py-2 rounded text-sm font-medium transition-colors
							{data.activeType === null
								? 'bg-primary text-white'
								: 'text-gray-700 hover:bg-gray-100'}"
					>
						All types
					</button>
					{#each data.taskTypes as t}
						<button
							onclick={() => onTypeChange(t.slug)}
							class="text-left px-3 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors
								{data.activeType === t.slug
									? 'bg-primary text-white'
									: 'text-gray-700 hover:bg-gray-100'}"
						>
							<span>{t.icon}</span>
							<span class="truncate">{t.name}</span>
						</button>
					{/each}
				</nav>
			</div>

			<!-- About modular design note -->
			<div class="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
				<strong class="block mb-1">Extensible by design</strong>
				New task types can be added via a single database insert — no code changes required.
			</div>
		</aside>

		<!-- Main content -->
		<div class="flex-1 min-w-0">
			<!-- Search bar -->
			<form onsubmit={onSearch} class="mb-6 flex gap-2">
				<input
					type="search"
					placeholder="Search tasks by name, location…"
					bind:value={search}
					class="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
				/>
				<button type="submit" class="btn-primary px-5">Search</button>
			</form>

			{#if data.tasks.length === 0}
				<div class="text-center py-20 text-gray-400">
					<div class="text-5xl mb-4">🔍</div>
					<p class="text-lg font-medium">No tasks found</p>
					<p class="text-sm mt-1">Try a different filter or search term.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
					{#each data.tasks as task (task.id)}
						<TaskCard {task} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
