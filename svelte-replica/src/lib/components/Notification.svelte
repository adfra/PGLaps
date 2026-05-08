<script lang="ts">
	import { notifications } from '$lib/stores/notifications.js';
	import { fly } from 'svelte/transition';
</script>

<div class="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
	{#each $notifications as n (n.id)}
		<div
			transition:fly={{ y: 20, duration: 250 }}
			class="pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-white shadow-lg min-w-[260px] max-w-sm text-sm font-medium"
			class:bg-success={n.type === 'success'}
			class:bg-danger={n.type === 'error'}
			class:bg-blue-500={n.type === 'info'}
		>
			<span class="flex-1">{n.message}</span>
			<button
				onclick={() => notifications.remove(n.id)}
				class="ml-2 text-white/70 hover:text-white leading-none text-lg"
				aria-label="Dismiss"
			>×</button>
		</div>
	{/each}
</div>
