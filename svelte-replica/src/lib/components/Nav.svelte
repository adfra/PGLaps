<script lang="ts">
	import { page } from '$app/stores';

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/transposer', label: 'Online Transposer' },
		{ href: '/tasks', label: 'Task Library' },
		{ href: '/downloads', label: 'Downloads' }
	];

	let mobileOpen = $state(false);
</script>

<nav class="bg-navy text-white shadow-md sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2 font-bold text-xl tracking-tight">
				<span class="text-primary text-2xl">⛵</span>
				<span>PG<span class="text-primary">Laps</span></span>
			</a>

			<!-- Desktop links -->
			<div class="hidden md:flex items-center gap-1">
				{#each links as link}
					<a
						href={link.href}
						class="px-4 py-2 rounded text-sm font-medium transition-colors
						{$page.url.pathname === link.href
							? 'bg-primary text-white'
							: 'text-gray-300 hover:text-white hover:bg-navy-light'}"
					>
						{link.label}
					</a>
				{/each}
			</div>

			<!-- Mobile hamburger -->
			<button
				class="md:hidden p-2 rounded text-gray-300 hover:text-white"
				onclick={() => (mobileOpen = !mobileOpen)}
				aria-label="Toggle menu"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{#if mobileOpen}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if mobileOpen}
		<div class="md:hidden bg-navy-light border-t border-white/10 px-4 py-2 flex flex-col gap-1">
			{#each links as link}
				<a
					href={link.href}
					onclick={() => (mobileOpen = false)}
					class="block px-4 py-2 rounded text-sm font-medium
					{$page.url.pathname === link.href
						? 'bg-primary text-white'
						: 'text-gray-300 hover:text-white hover:bg-white/10'}"
				>
					{link.label}
				</a>
			{/each}
		</div>
	{/if}
</nav>
