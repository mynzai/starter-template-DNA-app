<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import * as d3 from 'd3';
	import { Vector3 } from 'three';
	import { WebGLRenderer } from '$lib/webgl/renderer';
	import type { DataPoint, ChartConfig, PerformanceMetrics } from '$types';

	// Props
	export let data: DataPoint[] = [];
	export let config: ChartConfig;
	export let onPerformanceUpdate: ((metrics: PerformanceMetrics) => void) | undefined = undefined;

	// Component state
	let containerElement: HTMLDivElement;
	let canvasElement: HTMLCanvasElement;
	let svgElement: SVGSVGElement;
	let webglRenderer: WebGLRenderer | null = null;
	let animationFrame: number;
	let camera = {
		position: new Vector3(0, 0, 10),
		target: new Vector3(0, 0, 0)
	};

	// Reactive statements
	$: if (browser && canvasElement && data.length > 0) {
		updateVisualization();
	}

	$: if (browser && svgElement && data.length > 0 && !config.rendering.webgl) {
		updateSVGVisualization();
	}

	onMount(() => {
		if (!browser) return;
		
		setupRenderer();
		startAnimationLoop();
		
		// Handle window resize
		const handleResize = () => {
			if (webglRenderer && containerElement) {
				const { width, height } = containerElement.getBoundingClientRect();
				webglRenderer.resize(width, height);
			}
		};
		
		window.addEventListener('resize', handleResize);
		
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
		
		if (webglRenderer) {
			webglRenderer.dispose();
		}
	});

	function setupRenderer(): void {
		if (!canvasElement || !config.rendering.webgl) return;

		try {
			webglRenderer = new WebGLRenderer(canvasElement, {
				antialias: config.rendering.antialiasing,
				alpha: true,
				premultipliedAlpha: false,
				preserveDrawingBuffer: true,
				powerPreference: 'high-performance',
				failIfMajorPerformanceCaveat: false
			});

			// Set canvas size
			const { width, height } = containerElement.getBoundingClientRect();
			webglRenderer.resize(width, height);
			
		} catch (error) {
			console.warn('WebGL not available, falling back to SVG:', error);
			config.rendering.webgl = false;
		}
	}

	function updateVisualization(): void {
		if (!webglRenderer || !data.length) return;

		// Upload data to GPU
		webglRenderer.uploadData('main', data);
		
		// Start render loop
		render();
	}

	function updateSVGVisualization(): void {
		if (!svgElement || !data.length || config.rendering.webgl) return;

		const svg = d3.select(svgElement);
		svg.selectAll('*').remove();

		const { width, height, margin } = config;
		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;

		// Create scales
		const xScale = d3.scaleLinear()
			.domain(d3.extent(data, d => d.x) as [number, number])
			.range([0, innerWidth]);

		const yScale = d3.scaleLinear()
			.domain(d3.extent(data, d => d.y) as [number, number])
			.range([innerHeight, 0]);

		const colorScale = d3.scaleSequential(d3.interpolateViridis)
			.domain(d3.extent(data, d => d.value || 0) as [number, number]);

		// Create main group
		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Add axes
		g.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(d3.axisBottom(xScale));

		g.append('g')
			.attr('class', 'y-axis')
			.call(d3.axisLeft(yScale));

		// Add points with optimization for large datasets
		if (data.length > 10000) {
			// Use canvas for large datasets
			renderLargeDatasetSVG(g, data, xScale, yScale, colorScale);
		} else {
			// Use SVG circles for smaller datasets
			renderSmallDatasetSVG(g, data, xScale, yScale, colorScale);
		}
	}

	function renderSmallDatasetSVG(
		g: d3.Selection<SVGGElement, unknown, null, undefined>,
		data: DataPoint[],
		xScale: d3.ScaleLinear<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		colorScale: d3.ScaleSequential<string>
	): void {
		g.selectAll('.point')
			.data(data)
			.enter()
			.append('circle')
			.attr('class', 'point')
			.attr('cx', d => xScale(d.x))
			.attr('cy', d => yScale(d.y))
			.attr('r', d => Math.sqrt((d.value || 1) * 3))
			.attr('fill', d => colorScale(d.value || 0))
			.attr('opacity', 0.7)
			.on('mouseover', function(event, d) {
				if (config.interaction.tooltip) {
					showTooltip(event, d);
				}
			})
			.on('mouseout', hideTooltip);

		// Add animations if enabled
		if (config.animation.enabled) {
			g.selectAll('.point')
				.style('opacity', 0)
				.transition()
				.duration(config.animation.duration)
				.delay((d, i) => i * config.animation.stagger)
				.style('opacity', 0.7);
		}
	}

	function renderLargeDatasetSVG(
		g: d3.Selection<SVGGElement, unknown, null, undefined>,
		data: DataPoint[],
		xScale: d3.ScaleLinear<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		colorScale: d3.ScaleSequential<string>
	): void {
		// Use canvas element for better performance with large datasets
		const canvasNode = g.append('foreignObject')
			.attr('width', config.width - config.margin.left - config.margin.right)
			.attr('height', config.height - config.margin.top - config.margin.bottom)
			.append('xhtml:canvas')
			.attr('width', config.width - config.margin.left - config.margin.right)
			.attr('height', config.height - config.margin.top - config.margin.bottom)
			.node() as HTMLCanvasElement;

		const context = canvasNode.getContext('2d')!;
		const devicePixelRatio = window.devicePixelRatio || 1;

		// Scale canvas for high DPI displays
		canvasNode.width = (config.width - config.margin.left - config.margin.right) * devicePixelRatio;
		canvasNode.height = (config.height - config.margin.top - config.margin.bottom) * devicePixelRatio;
		canvasNode.style.width = `${config.width - config.margin.left - config.margin.right}px`;
		canvasNode.style.height = `${config.height - config.margin.top - config.margin.bottom}px`;
		context.scale(devicePixelRatio, devicePixelRatio);

		// Render points
		data.forEach(point => {
			const x = xScale(point.x);
			const y = yScale(point.y);
			const radius = Math.sqrt((point.value || 1) * 3);
			const color = colorScale(point.value || 0);

			context.beginPath();
			context.arc(x, y, radius, 0, 2 * Math.PI);
			context.fillStyle = color;
			context.globalAlpha = 0.7;
			context.fill();
		});
	}

	function render(): void {
		if (!webglRenderer) return;

		webglRenderer.render('main', camera);

		// Update performance metrics
		if (onPerformanceUpdate) {
			const metrics = webglRenderer.getPerformanceMetrics();
			onPerformanceUpdate(metrics);
		}

		// Continue animation loop
		animationFrame = requestAnimationFrame(render);
	}

	function startAnimationLoop(): void {
		if (config.rendering.webgl && webglRenderer) {
			render();
		}
	}

	function showTooltip(event: MouseEvent, data: DataPoint): void {
		// Tooltip implementation
		console.log('Tooltip:', data);
	}

	function hideTooltip(): void {
		// Hide tooltip implementation
	}

	// Handle mouse interactions for camera control
	function handleMouseDown(event: MouseEvent): void {
		if (!config.interaction.pan) return;
		
		const startX = event.clientX;
		const startY = event.clientY;
		const startCameraX = camera.position.x;
		const startCameraY = camera.position.y;

		function handleMouseMove(moveEvent: MouseEvent): void {
			const deltaX = (moveEvent.clientX - startX) * 0.01;
			const deltaY = (moveEvent.clientY - startY) * 0.01;
			
			camera.position.x = startCameraX - deltaX;
			camera.position.y = startCameraY + deltaY;
		}

		function handleMouseUp(): void {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleWheel(event: WheelEvent): void {
		if (!config.interaction.zoom) return;
		
		event.preventDefault();
		const zoomFactor = event.deltaY * 0.01;
		camera.position.z = Math.max(1, camera.position.z + zoomFactor);
	}
</script>

<div class="scatter-plot-container" bind:this={containerElement}>
	<!-- WebGL Canvas for high-performance rendering -->
	{#if config.rendering.webgl}
		<canvas
			bind:this={canvasElement}
			class="webgl-canvas"
			width={config.width}
			height={config.height}
			on:mousedown={handleMouseDown}
			on:wheel={handleWheel}
		></canvas>
	{/if}

	<!-- SVG fallback for smaller datasets or when WebGL is not available -->
	{#if !config.rendering.webgl}
		<svg
			bind:this={svgElement}
			class="svg-chart"
			width={config.width}
			height={config.height}
			on:mousedown={handleMouseDown}
			on:wheel={handleWheel}
		></svg>
	{/if}

	<!-- Chart title and subtitle -->
	{#if config.title}
		<div class="chart-title">
			<h3>{config.title}</h3>
			{#if config.subtitle}
				<p class="chart-subtitle">{config.subtitle}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.scatter-plot-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.webgl-canvas,
	.svg-chart {
		display: block;
		width: 100%;
		height: 100%;
		cursor: crosshair;
	}

	.chart-title {
		position: absolute;
		top: 10px;
		left: 10px;
		pointer-events: none;
	}

	.chart-title h3 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.chart-subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	:global(.x-axis),
	:global(.y-axis) {
		font-size: 12px;
	}

	:global(.x-axis .tick line),
	:global(.y-axis .tick line) {
		stroke: var(--color-grid);
	}

	:global(.x-axis .domain),
	:global(.y-axis .domain) {
		stroke: var(--color-grid);
	}
</style>