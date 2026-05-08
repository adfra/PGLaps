<script lang="ts">
	let {
		accept,
		label,
		filename = '',
		onFile
	}: {
		accept: string;
		label: string;
		filename?: string;
		onFile: (file: File) => void;
	} = $props();

	let dragging = $state(false);
	let inputEl: HTMLInputElement;

	function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		onFile(files[0]);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function onDragLeave() {
		dragging = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		handleFiles(e.dataTransfer?.files ?? null);
	}

	function onInputChange(e: Event) {
		handleFiles((e.target as HTMLInputElement).files);
	}
</script>

<div
	role="button"
	tabindex="0"
	class="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-150
		{dragging ? 'border-primary bg-primary-light' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}"
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
	onclick={() => inputEl.click()}
	onkeydown={(e) => e.key === 'Enter' && inputEl.click()}
>
	<input
		bind:this={inputEl}
		type="file"
		{accept}
		class="hidden"
		onchange={onInputChange}
	/>

	{#if filename}
		<div class="flex items-center justify-center gap-2 text-success">
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span class="text-sm font-medium truncate">{filename}</span>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-1 text-gray-500">
			<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
			</svg>
			<span class="text-sm font-medium text-primary">{label}</span>
			<span class="text-xs text-gray-400">Drag & drop or click to browse</span>
			<span class="text-xs text-gray-400 font-mono">{accept}</span>
		</div>
	{/if}
</div>
