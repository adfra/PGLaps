<script lang="ts">
	const tools = [
		{
			name: 'TaskCreator',
			version: 'v1.1',
			description: 'Generate XCTrack task definitions from scratch. Specify a starting coordinate and a series of leg specs (distance, bearing change, radius). Outputs the turnpoints JSON for .xctsk files.',
			usage: 'Interactive CLI. Enter start coordinates then pipe-separated leg specs.',
			format: 'Leg format: distance_m,bearing_change_deg,radius_m',
			example: '600,0,50|600,-45,200|600,158,400',
			file: 'PGLaps_TaskCreator_v1.1.exe',
			icon: '✏️',
			color: '#007bff'
		},
		{
			name: 'TaskTransposer',
			version: 'v3.1',
			description: 'Relocate and rotate an existing .xctsk task to a new location. Takes a task file, OpenAir airspace file, new coordinates and bearing. Outputs transformed .xctsk and .cup files.',
			usage: 'Provide task file, airspace file, new lat/lon and departure bearing.',
			format: 'Output: TransformedTask_YYYYMMDD-HHMM.xctsk / .cup, TransformedAirspaces_YYYYMMDD-HHMM.txt',
			example: '',
			file: 'PGLaps_TaskTransposer_v3.1.zip',
			icon: '🔄',
			color: '#28a745'
		}
	];

	const formats = [
		{
			name: '.xctsk',
			title: 'XCTrack Task',
			desc: 'JSON-based task format used by XCTrack navigation app. Contains turnpoints, speed section settings and goal configuration.',
			fields: ['version', 'taskType', 'earthModel', 'turnpoints[]', 'sss (optional)', 'goal (optional)']
		},
		{
			name: '.cup',
			title: 'SeeYou / FS',
			desc: 'CSV-based waypoint format compatible with SeeYou and FS competition software. Includes observation zone radii and competition options.',
			fields: ['name, code, lat, lon, elev', 'style, rwdir, rwlen', 'ObsZone per turnpoint', 'Options (GoalIsLine, Competition)']
		},
		{
			name: 'OpenAir .txt',
			title: 'Airspace',
			desc: 'Plain-text airspace definition format. Contains class, name, floor/ceiling altitudes and polygon coordinates.',
			fields: ['AC (class)', 'AN (name)', 'AL (floor)', 'AH (ceiling)', 'DP (polygon point)']
		}
	];
</script>

<svelte:head>
	<title>Downloads — PGLaps</title>
</svelte:head>

<div class="bg-gray-50 border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-1">CLI Downloads</h1>
		<p class="text-gray-500 text-sm">Windows command-line tools for task creation and transposition.</p>
	</div>
</div>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

	<!-- Tools -->
	<section>
		<h2 class="text-xl font-bold text-gray-900 mb-5">Available tools</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each tools as tool}
				<div class="card p-6 border-l-4" style="border-left-color: {tool.color}">
					<div class="flex items-start justify-between mb-4">
						<div>
							<div class="flex items-center gap-2 mb-1">
								<span class="text-2xl">{tool.icon}</span>
								<h3 class="text-lg font-bold text-gray-900">{tool.name}</h3>
								<span class="badge text-white text-xs" style="background-color: {tool.color}">{tool.version}</span>
							</div>
						</div>
					</div>
					<p class="text-sm text-gray-600 leading-relaxed mb-4">{tool.description}</p>

					<div class="space-y-2 text-xs">
						<div class="bg-gray-50 rounded p-3">
							<span class="font-semibold text-gray-700">Usage: </span>
							<span class="text-gray-600">{tool.usage}</span>
						</div>
						{#if tool.format}
							<div class="bg-gray-50 rounded p-3 font-mono text-gray-700">
								{tool.format}
							</div>
						{/if}
						{#if tool.example}
							<div class="bg-gray-900 text-green-400 rounded p-3 font-mono">
								{tool.example}
							</div>
						{/if}
					</div>

					<div class="mt-4 pt-4 border-t border-gray-100">
						<p class="text-xs text-gray-400 mb-2">File: <span class="font-mono">{tool.file}</span></p>
						<a
							href="https://pglaps.com/downloads/{tool.file}"
							class="btn-outline text-sm"
						>
							⬇ Download {tool.name} {tool.version}
						</a>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Online alternative -->
	<section class="bg-primary/5 border border-primary/20 rounded-xl p-6">
		<div class="flex flex-col md:flex-row items-start md:items-center gap-4">
			<div class="flex-1">
				<h3 class="text-base font-bold text-gray-900 mb-1">Prefer to work in the browser?</h3>
				<p class="text-sm text-gray-600">
					The Online Transposer provides full task transposition without installing anything.
					Upload your files, adjust the task on an interactive map, and export in seconds.
				</p>
			</div>
			<a href="/transposer" class="btn-primary flex-shrink-0">Open Online Transposer</a>
		</div>
	</section>

	<!-- File formats -->
	<section>
		<h2 class="text-xl font-bold text-gray-900 mb-5">Supported file formats</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
			{#each formats as fmt}
				<div class="card p-5">
					<div class="flex items-center gap-2 mb-3">
						<span class="font-mono text-sm font-bold text-primary bg-primary-light px-2 py-0.5 rounded">{fmt.name}</span>
						<span class="font-semibold text-gray-900 text-sm">{fmt.title}</span>
					</div>
					<p class="text-xs text-gray-500 leading-relaxed mb-3">{fmt.desc}</p>
					<ul class="space-y-1">
						{#each fmt.fields as field}
							<li class="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{field}</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
</div>
