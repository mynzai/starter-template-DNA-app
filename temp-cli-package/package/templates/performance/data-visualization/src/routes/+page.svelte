<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import ScatterPlot from '$lib/charts/ScatterPlot.svelte';
	import { DataStream } from '$lib/streaming/DataStream';
	import { ExportService } from '$lib/export/ExportService';
	import type { DataPoint, ChartConfig, PerformanceMetrics, StreamConfig } from '$types';

	// Component state
	let mounted = false;
	let data: DataPoint[] = [];
	let performanceMetrics: PerformanceMetrics | null = null;
	let dataStream: DataStream | null = null;
	let exportService: ExportService;
	let chartContainer: HTMLElement;

	// Configuration
	let chartConfig: ChartConfig = {
		type: 'scatter',
		width: 800,
		height: 600,
		margin: { top: 20, right: 20, bottom: 40, left: 40 },
		title: 'High-Performance Data Visualization',
		subtitle: 'WebGL-accelerated rendering for 1M+ data points',
		theme: {
			background: '#ffffff',
			foreground: '#000000',
			primary: '#007bff',
			secondary: '#6c757d',
			accent: '#28a745',
			grid: '#e9ecef',
			text: '#212529',
			colorScale: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']
		},
		animation: {
			enabled: true,
			duration: 1000,
			easing: 'ease-out',
			stagger: 2
		},
		interaction: {
			zoom: true,
			pan: true,
			brush: true,
			tooltip: true,
			selection: true,
			hover: true
		},
		rendering: {
			webgl: true,
			gpu: true,
			antialiasing: true,
			devicePixelRatio: window.devicePixelRatio || 1,
			maxDataPoints: 1000000,
			levelOfDetail: true
		}
	};

	let streamConfig: StreamConfig = {
		url: 'ws://localhost:8080/stream',
		protocol: 'websocket',
		reconnect: true,
		maxReconnects: 5,
		bufferSize: 10000,
		throttleMs: 16 // 60fps
	};

	// Demo data generation
	let dataSize = 100000;
	let isGenerating = false;
	let isStreaming = false;

	onMount(() => {
		mounted = true;
		exportService = new ExportService();
		generateDemoData();
	});

	function generateDemoData(): void {
		if (isGenerating) return;
		isGenerating = true;

		// Generate large dataset for performance testing
		const newData: DataPoint[] = [];
		const startTime = performance.now();

		for (let i = 0; i < dataSize; i++) {
			const angle = (i / dataSize) * Math.PI * 2 * 10; // Multiple spirals
			const radius = Math.sqrt(i / dataSize) * 200;
			const noise = (Math.random() - 0.5) * 20;

			newData.push({
				x: Math.cos(angle) * radius + noise,
				y: Math.sin(angle) * radius + noise,
				z: Math.sin(i * 0.01) * 50,
				value: Math.random(),
				label: `Point ${i}`,
				timestamp: Date.now() + i,
				category: `Category ${i % 5}`,
				metadata: {
					cluster: Math.floor(i / 1000),
					importance: Math.random()
				}
			});
		}

		const generationTime = performance.now() - startTime;
		console.log(`Generated ${dataSize} points in ${generationTime.toFixed(2)}ms`);

		data = newData;
		isGenerating = false;
	}

	function handlePerformanceUpdate(metrics: PerformanceMetrics): void {
		performanceMetrics = metrics;
	}

	async function startStreaming(): Promise<void> {
		if (isStreaming || !mounted) return;

		try {
			isStreaming = true;
			dataStream = new DataStream(streamConfig);
			
			// Subscribe to streaming data
			dataStream.data.subscribe(streamData => {
				if (streamData.length > 0) {
					data = [...data, ...streamData].slice(-chartConfig.rendering.maxDataPoints!);
				}
			});

			await dataStream.connect();
			console.log('Streaming started');
		} catch (error) {
			console.error('Failed to start streaming:', error);
			isStreaming = false;
		}
	}

	function stopStreaming(): void {
		if (dataStream) {
			dataStream.disconnect();
			dataStream = null;
		}
		isStreaming = false;
	}

	async function exportChart(format: 'png' | 'svg' | 'pdf' | 'html'): Promise<void> {
		if (!chartContainer || !exportService) return;

		try {
			await exportService.export(
				chartContainer,
				data,
				{
					format,
					resolution: { width: 1920, height: 1080, scale: 2 },
					quality: 95,
					includeData: format === 'html',
					interactive: format === 'html',
					filename: `data-visualization-${Date.now()}`
				},
				chartConfig
			);
		} catch (error) {
			console.error('Export failed:', error);
		}
	}

	function updateDataSize(): void {
		generateDemoData();
	}

	function toggleWebGL(): void {
		chartConfig = {
			...chartConfig,
			rendering: {
				...chartConfig.rendering,
				webgl: !chartConfig.rendering.webgl
			}
		};
	}

	// Performance monitoring
	$: fps = performanceMetrics ? Math.round(performanceMetrics.frameRate) : 0;
	$: renderTime = performanceMetrics ? performanceMetrics.renderTime.toFixed(2) : '0';
	$: memoryUsage = performanceMetrics ? performanceMetrics.memoryUsage.toFixed(1) : '0';
</script>

<svelte:head>
	<title>Data Visualization Dashboard</title>
</svelte:head>

<div class="dashboard">
	<div class="dashboard-header">
		<h1>High-Performance Data Visualization</h1>
		<p>WebGL-accelerated charts for datasets with 1M+ data points</p>
	</div>

	<!-- Control Panel -->
	<div class="control-panel">
		<div class="control-group">
			<label>
				Data Points:
				<input 
					type="range" 
					min="1000" 
					max="1000000" 
					step="1000"
					bind:value={dataSize}
					on:change={updateDataSize}
				/>
				<span class="value">{dataSize.toLocaleString()}</span>
			</label>
		</div>

		<div class="control-group">
			<button 
				class="btn btn-primary" 
				on:click={generateDemoData}
				disabled={isGenerating}
			>
				{isGenerating ? 'Generating...' : 'Generate Data'}
			</button>
			
			<button 
				class="btn btn-secondary" 
				on:click={toggleWebGL}
			>
				{chartConfig.rendering.webgl ? 'Disable WebGL' : 'Enable WebGL'}
			</button>
		</div>

		<div class="control-group">
			<button 
				class="btn btn-success" 
				on:click={startStreaming}
				disabled={isStreaming}
			>
				Start Streaming
			</button>
			
			<button 
				class="btn btn-warning" 
				on:click={stopStreaming}
				disabled={!isStreaming}
			>
				Stop Streaming
			</button>
		</div>

		<div class="control-group export-controls">
			<span class="label">Export:</span>
			<button class="btn btn-outline" on:click={() => exportChart('png')}>PNG</button>
			<button class="btn btn-outline" on:click={() => exportChart('svg')}>SVG</button>
			<button class="btn btn-outline" on:click={() => exportChart('pdf')}>PDF</button>
			<button class="btn btn-outline" on:click={() => exportChart('html')}>HTML</button>
		</div>
	</div>

	<!-- Performance Metrics -->
	<div class="metrics-panel">
		<div class="metric">
			<span class="metric-label">FPS:</span>
			<span class="metric-value">{fps}</span>
		</div>
		<div class="metric">
			<span class="metric-label">Render Time:</span>
			<span class="metric-value">{renderTime}ms</span>
		</div>
		<div class="metric">
			<span class="metric-label">Memory:</span>
			<span class="metric-value">{memoryUsage}MB</span>
		</div>
		<div class="metric">
			<span class="metric-label">Data Points:</span>
			<span class="metric-value">{data.length.toLocaleString()}</span>
		</div>
		<div class="metric">
			<span class="metric-label">Rendering:</span>
			<span class="metric-value">{chartConfig.rendering.webgl ? 'WebGL' : 'SVG'}</span>
		</div>
	</div>

	<!-- Main Chart -->
	<div class="chart-section" bind:this={chartContainer}>
		{#if mounted && data.length > 0}
			<ScatterPlot 
				{data} 
				config={chartConfig}
				onPerformanceUpdate={handlePerformanceUpdate}
			/>
		{:else}
			<div class="chart-placeholder">
				<p>Loading visualization...</p>
			</div>
		{/if}
	</div>

	<!-- Statistics Panel -->
	<div class="stats-panel">
		<h3>Dataset Statistics</h3>
		<div class="stats-grid">
			<div class="stat">
				<span class="stat-label">Total Points</span>
				<span class="stat-value">{data.length.toLocaleString()}</span>
			</div>
			<div class="stat">
				<span class="stat-label">X Range</span>
				<span class="stat-value">
					{data.length > 0 ? `${Math.min(...data.map(d => d.x)).toFixed(1)} to ${Math.max(...data.map(d => d.x)).toFixed(1)}` : 'N/A'}
				</span>
			</div>
			<div class="stat">
				<span class="stat-label">Y Range</span>
				<span class="stat-value">
					{data.length > 0 ? `${Math.min(...data.map(d => d.y)).toFixed(1)} to ${Math.max(...data.map(d => d.y)).toFixed(1)}` : 'N/A'}
				</span>
			</div>
			<div class="stat">
				<span class="stat-label">Categories</span>
				<span class="stat-value">
					{data.length > 0 ? new Set(data.map(d => d.category)).size : 0}
				</span>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 100%;
	}

	.dashboard-header {
		text-align: center;
		margin-bottom: 1rem;
	}

	.dashboard-header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.dashboard-header p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 1.1rem;
	}

	.control-panel {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding: 1.5rem;
		background-color: var(--color-bg-primary);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--color-border);
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.control-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.control-group input[type="range"] {
		width: 150px;
	}

	.value {
		font-weight: 600;
		color: var(--color-primary);
		min-width: 80px;
	}

	.export-controls {
		border-left: 1px solid var(--color-border);
		padding-left: 1rem;
	}

	.label {
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.btn {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-primary);
		color: var(--color-text);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.btn:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
		border-color: var(--color-primary-hover);
	}

	.btn-secondary {
		background-color: var(--color-secondary);
		color: white;
		border-color: var(--color-secondary);
	}

	.btn-success {
		background-color: var(--color-success);
		color: white;
		border-color: var(--color-success);
	}

	.btn-warning {
		background-color: var(--color-warning);
		color: white;
		border-color: var(--color-warning);
	}

	.btn-outline {
		background-color: transparent;
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.btn-outline:hover:not(:disabled) {
		background-color: var(--color-primary);
		color: white;
	}

	.metrics-panel {
		display: flex;
		gap: 1.5rem;
		padding: 1rem 1.5rem;
		background-color: var(--color-bg-primary);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.metric {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.metric-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.metric-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.chart-section {
		background-color: var(--color-bg-primary);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		border: 1px solid var(--color-border);
		overflow: hidden;
		min-height: 600px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chart-placeholder {
		text-align: center;
		color: var(--color-text-secondary);
	}

	.stats-panel {
		padding: 1.5rem;
		background-color: var(--color-bg-primary);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--color-border);
	}

	.stats-panel h3 {
		margin: 0 0 1rem 0;
		color: var(--color-text);
		font-weight: 600;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background-color: var(--color-bg-secondary);
		border-radius: var(--radius-md);
	}

	.stat-label {
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.stat-value {
		font-weight: 600;
		color: var(--color-text);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.control-panel {
			flex-direction: column;
			gap: 1rem;
		}

		.control-group {
			justify-content: center;
		}

		.export-controls {
			border-left: none;
			border-top: 1px solid var(--color-border);
			padding-left: 0;
			padding-top: 1rem;
		}

		.metrics-panel {
			justify-content: center;
		}

		.dashboard-header h1 {
			font-size: 2rem;
		}
	}
</style>