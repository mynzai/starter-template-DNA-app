// Core data visualization types
export interface DataPoint {
	x: number;
	y: number;
	z?: number;
	value?: number;
	label?: string;
	timestamp?: number;
	category?: string;
	metadata?: Record<string, any>;
}

export interface Dataset {
	id: string;
	name: string;
	description?: string;
	data: DataPoint[];
	schema: DataSchema;
	createdAt: Date;
	updatedAt: Date;
	size: number;
}

export interface DataSchema {
	fields: SchemaField[];
	primaryKey?: string;
	timeField?: string;
}

export interface SchemaField {
	name: string;
	type: 'number' | 'string' | 'date' | 'boolean' | 'category';
	required: boolean;
	format?: string;
	min?: number;
	max?: number;
}

// Chart configuration types
export interface ChartConfig {
	type: ChartType;
	width: number;
	height: number;
	margin: ChartMargin;
	title?: string;
	subtitle?: string;
	theme: ChartTheme;
	animation: AnimationConfig;
	interaction: InteractionConfig;
	rendering: RenderingConfig;
}

export type ChartType = 
	| 'line' 
	| 'scatter' 
	| 'bar' 
	| 'area' 
	| 'heatmap' 
	| 'network' 
	| 'treemap' 
	| 'parallel' 
	| 'sankey'
	| '3d-scatter'
	| 'surface';

export interface ChartMargin {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface ChartTheme {
	background: string;
	foreground: string;
	primary: string;
	secondary: string;
	accent: string;
	grid: string;
	text: string;
	colorScale: string[];
}

export interface AnimationConfig {
	enabled: boolean;
	duration: number;
	easing: string;
	stagger: number;
}

export interface InteractionConfig {
	zoom: boolean;
	pan: boolean;
	brush: boolean;
	tooltip: boolean;
	selection: boolean;
	hover: boolean;
}

export interface RenderingConfig {
	webgl: boolean;
	gpu: boolean;
	antialiasing: boolean;
	devicePixelRatio?: number;
	maxDataPoints?: number;
	levelOfDetail: boolean;
}

// Performance monitoring types
export interface PerformanceMetrics {
	renderTime: number;
	frameRate: number;
	memoryUsage: number;
	dataSize: number;
	timestamp: number;
}

export interface PerformanceBenchmark {
	name: string;
	dataSize: number;
	renderTime: number;
	memoryPeak: number;
	frameRate: number;
	passed: boolean;
}

// Real-time streaming types
export interface StreamConfig {
	url: string;
	protocol: 'websocket' | 'sse' | 'polling';
	reconnect: boolean;
	maxReconnects: number;
	bufferSize: number;
	throttleMs: number;
}

export interface StreamMessage {
	type: 'data' | 'error' | 'status' | 'metadata';
	payload: any;
	timestamp: number;
	sequence?: number;
}

export interface StreamState {
	connected: boolean;
	reconnecting: boolean;
	error: string | null;
	latency: number;
	messageCount: number;
	dataRate: number;
}

// Export types
export interface ExportConfig {
	format: ExportFormat;
	resolution: ExportResolution;
	quality: number;
	includeData: boolean;
	interactive: boolean;
	filename?: string;
}

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'html' | 'json';

export interface ExportResolution {
	width: number;
	height: number;
	scale: number;
}

// WebGL/GPU types
export interface WebGLConfig {
	antialias: boolean;
	alpha: boolean;
	premultipliedAlpha: boolean;
	preserveDrawingBuffer: boolean;
	powerPreference: 'default' | 'high-performance' | 'low-power';
	failIfMajorPerformanceCaveat: boolean;
}

export interface GPUBuffer {
	vertices: Float32Array;
	indices: Uint32Array;
	colors: Float32Array;
	size: number;
}

// Component props types
export interface ChartProps {
	data: Dataset;
	config: ChartConfig;
	onDataUpdate?: (data: Dataset) => void;
	onError?: (error: Error) => void;
	onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}

// Store types
export interface AppState {
	datasets: Dataset[];
	activeDataset: string | null;
	charts: ChartConfig[];
	performance: PerformanceMetrics[];
	stream: StreamState;
	theme: 'light' | 'dark' | 'auto';
	settings: AppSettings;
}

export interface AppSettings {
	maxDataPoints: number;
	enableWebGL: boolean;
	enableGPU: boolean;
	autoSave: boolean;
	telemetry: boolean;
	theme: 'light' | 'dark' | 'auto';
}

// Utility types
export type ChartEventHandler<T = any> = (event: CustomEvent<T>) => void;
export type DataTransform = (data: DataPoint[]) => DataPoint[];
export type ColorScale = (value: number) => string;
export type Accessor<T> = (d: DataPoint) => T;