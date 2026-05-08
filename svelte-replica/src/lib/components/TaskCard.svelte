<script lang="ts">
	import type { Task } from '$lib/types/index.js';

	let { task }: { task: Task } = $props();

	const type = task.type!;

	// Pick the first 3 non-textarea fields with values to show as a summary
	const summaryFields = type.fieldSchema
		.filter((f) => f.type !== 'textarea' && task.data[f.key] !== undefined && task.data[f.key] !== '')
		.slice(0, 3);

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<a
	href="/tasks/{task.id}"
	class="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
>
	<!-- Type color bar -->
	<div class="h-1.5 w-full" style="background-color: {type.color}"></div>

	<div class="p-5">
		<!-- Header -->
		<div class="flex items-start justify-between gap-3 mb-3">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<span
						class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
						style="background-color: {type.color}"
					>
						<span>{type.icon}</span>
						<span>{type.name}</span>
					</span>
				</div>
				<h3 class="font-semibold text-gray-900 group-hover:text-primary transition-colors truncate text-base">
					{task.name}
				</h3>
			</div>
		</div>

		<!-- Location -->
		{#if task.location}
			<p class="text-xs text-gray-500 flex items-center gap-1 mb-3">
				<svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				{task.location}
			</p>
		{/if}

		<!-- Summary fields -->
		{#if summaryFields.length > 0}
			<div class="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
				{#each summaryFields as field}
					<div>
						<p class="text-xs text-gray-400">{field.label}</p>
						<p class="text-sm font-semibold text-gray-800">
							{task.data[field.key]}{field.unit ? ` ${field.unit}` : ''}
						</p>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Footer -->
		<div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
			<span class="text-xs text-gray-400">{formatDate(task.createdAt)}</span>
			<span class="text-xs text-primary font-medium group-hover:underline">View details →</span>
		</div>
	</div>
</a>
