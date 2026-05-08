<script lang="ts">
	const features = [
		{
			icon: '🗺️',
			title: 'Online Transposer',
			description:
				'Instantly relocate and rotate any XCTrack task to a new location. Upload a .xctsk file and airspace, drag the start point on the map, adjust the bearing, and export.',
			href: '/transposer',
			cta: 'Open Transposer',
			color: '#007bff'
		},
		{
			icon: '📚',
			title: 'Task Library',
			description:
				'Browse a growing collection of competition tasks organised by type. Filter by SCLR, Hike & Fly, Cross-Country and more. Download task files directly.',
			href: '/tasks',
			cta: 'Browse Tasks',
			color: '#28a745'
		},
		{
			icon: '⬇️',
			title: 'CLI Downloads',
			description:
				'Powerful command-line tools for task creation and transposition. TaskCreator builds tasks from leg specs. TaskTransposer outputs .xctsk and .cup formats.',
			href: '/downloads',
			cta: 'Get CLI Tools',
			color: '#6f42c1'
		}
	];

	const taskTypes = [
		{ icon: '🔄', name: 'Short Circuit Lap Racing', slug: 'sclr', color: '#007bff', desc: 'Closed-circuit format run over terrain for spectator racing.' },
		{ icon: '🏔️', name: 'Hike & Fly', slug: 'hike-and-fly', color: '#28a745', desc: 'Hike to launch, fly the task. Alpine competition format.' },
		{ icon: '🌄', name: 'Cross-Country', slug: 'cross-country', color: '#6f42c1', desc: 'Navigate waypoints over distance. The classic format.' },
		{ icon: '⚡', name: 'Speed Run', slug: 'speed-run', color: '#fd7e14', desc: 'Sprint head-to-head on a defined short course.' }
	];

	const steps = [
		{ n: '01', title: 'Design your task', desc: 'Use the TaskCreator CLI to build a task from leg specifications, or load an existing .xctsk file.' },
		{ n: '02', title: 'Transpose to site', desc: 'Open the Online Transposer, upload your task and local airspace file. Drag the start point to your new location.' },
		{ n: '03', title: 'Set the bearing', desc: 'Rotate the task with the slider to match terrain features and wind. The geometry is preserved exactly.' },
		{ n: '04', title: 'Export & fly', desc: 'Download the transformed .xctsk file for XCTrack and the .txt airspace file. Load onto pilot devices and go.' }
	];
</script>

<svelte:head>
	<title>PGLaps — Paragliding Competition Task Management</title>
</svelte:head>

<!-- Hero -->
<section class="relative bg-gradient-to-br from-navy to-blue-800 text-white overflow-hidden">
	<div class="absolute inset-0 opacity-5 hero-bg-pattern"></div>
	<div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
		<div class="max-w-3xl">
			<div class="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
				<span>⛵</span> Paragliding Competition Toolsuite
			</div>
			<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
				Task management<br />made <span class="text-primary">simple</span>
			</h1>
			<p class="text-lg md:text-xl text-blue-100 mb-8 leading-relaxed max-w-2xl">
				PGLaps provides everything you need to design, transpose, and manage paragliding
				competition tasks — from Short Circuit Lap Racing to cross-country events.
			</p>
			<div class="flex flex-wrap gap-3">
				<a href="/transposer" class="btn-primary text-base px-6 py-3">
					Open Transposer →
				</a>
				<a href="/tasks" class="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 text-base px-6 py-3">
					Browse Tasks
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Features -->
<section class="py-16 bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-12">
			<h2 class="text-3xl font-bold text-gray-900 mb-3">Everything you need</h2>
			<p class="text-gray-500 max-w-xl mx-auto">
				Browser-based tools and downloadable CLIs for every stage of competition task preparation.
			</p>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			{#each features as f}
				<div class="card p-6 flex flex-col hover:shadow-md transition-shadow">
					<div
						class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
						style="background-color: {f.color}18"
					>
						{f.icon}
					</div>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
					<p class="text-sm text-gray-500 leading-relaxed flex-1">{f.description}</p>
					<a
						href={f.href}
						class="mt-4 inline-flex items-center text-sm font-semibold hover:underline"
						style="color: {f.color}"
					>
						{f.cta} →
					</a>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Task Types -->
<section class="py-16">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-end justify-between mb-8">
			<div>
				<h2 class="text-3xl font-bold text-gray-900 mb-2">Supported task types</h2>
				<p class="text-gray-500">Modular design — new types added via database, zero code changes.</p>
			</div>
			<a href="/tasks" class="text-primary text-sm font-semibold hover:underline hidden md:block">
				Browse task library →
			</a>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each taskTypes as t}
				<a
					href="/tasks?type={t.slug}"
					class="group card p-5 hover:shadow-md transition-all border-l-4"
					style="border-left-color: {t.color}"
				>
					<div class="text-3xl mb-3">{t.icon}</div>
					<h3 class="font-semibold text-gray-900 text-sm mb-1 group-hover:text-primary transition-colors">
						{t.name}
					</h3>
					<p class="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- How it works -->
<section class="py-16 bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-12">
			<h2 class="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
			<p class="text-gray-500">From task design to airborne in four steps.</p>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
			<!-- Connector line -->
			<div class="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gray-200 z-0"></div>
			{#each steps as step}
				<div class="relative z-10 flex flex-col items-center text-center">
					<div class="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md">
						{step.n}
					</div>
					<h3 class="font-semibold text-gray-900 mb-2">{step.title}</h3>
					<p class="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="py-16 bg-navy text-white">
	<div class="max-w-3xl mx-auto px-4 text-center">
		<h2 class="text-3xl font-bold mb-4">Ready to set the task?</h2>
		<p class="text-blue-200 mb-8">Upload your task file and transpose it to any site in seconds.</p>
		<a href="/transposer" class="btn-primary text-base px-8 py-3">
			Open Online Transposer →
		</a>
	</div>
</section>
