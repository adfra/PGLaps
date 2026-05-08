<script lang="ts">
	import type { TaskFieldDef } from '$lib/types/index.js';

	let {
		fieldSchema,
		data,
		mode = 'view'
	}: {
		fieldSchema: TaskFieldDef[];
		data: Record<string, unknown>;
		mode?: 'view' | 'edit';
	} = $props();
</script>

{#if mode === 'view'}
	<dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
		{#each fieldSchema as field}
			{@const value = data[field.key]}
			{#if value !== undefined && value !== null && value !== ''}
				<div class="col-span-1">
					<dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">{field.label}</dt>
					<dd class="mt-0.5 text-sm font-semibold text-gray-900">
						{#if field.type === 'boolean'}
							{value ? 'Yes' : 'No'}
						{:else}
							{value}{field.unit ? ` ${field.unit}` : ''}
						{/if}
					</dd>
					{#if field.description}
						<p class="text-xs text-gray-400">{field.description}</p>
					{/if}
				</div>
			{/if}
		{/each}
	</dl>
{:else}
	<!-- Edit mode: render form fields -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		{#each fieldSchema as field}
			<div class="flex flex-col gap-1" class:col-span-2={field.type === 'textarea'}>
				<label for="field-{field.key}" class="text-sm font-medium text-gray-700">
					{field.label}
					{#if field.required}<span class="text-danger ml-0.5">*</span>{/if}
					{#if field.unit}<span class="text-gray-400 text-xs ml-1">({field.unit})</span>{/if}
				</label>

				{#if field.type === 'select' && field.options}
					<select
						id="field-{field.key}"
						name={field.key}
						class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
						value={String(data[field.key] ?? '')}
					>
						<option value="">— Select —</option>
						{#each field.options as opt}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				{:else if field.type === 'textarea'}
					<textarea
						id="field-{field.key}"
						name={field.key}
						rows={3}
						class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
						value={String(data[field.key] ?? '')}
					></textarea>
				{:else if field.type === 'boolean'}
					<div class="flex items-center gap-2 mt-1">
						<input
							type="checkbox"
							id="field-{field.key}"
							name={field.key}
							checked={Boolean(data[field.key])}
							class="w-4 h-4 rounded text-primary"
						/>
						<span class="text-sm text-gray-600">{field.description ?? 'Enabled'}</span>
					</div>
				{:else}
					<input
						id="field-{field.key}"
						name={field.key}
						type={field.type === 'number' ? 'number' : 'text'}
						class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
						value={data[field.key] !== undefined ? String(data[field.key]) : ''}
						placeholder={field.description ?? ''}
					/>
				{/if}
			</div>
		{/each}
	</div>
{/if}
