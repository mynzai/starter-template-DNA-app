import { Matrix4, Vector3 } from 'three';
import type { DataPoint, WebGLConfig, GPUBuffer, PerformanceMetrics } from '$types';

/**
 * High-performance WebGL renderer for large datasets (1M+ points)
 * Uses GPU acceleration for real-time visualization
 */
export class WebGLRenderer {
	private canvas: HTMLCanvasElement;
	private gl: WebGLRenderingContext;
	private program: WebGLProgram;
	private buffers: Map<string, GPUBuffer>;
	private extensions: Map<string, any>;
	private viewMatrix: Matrix4;
	private projectionMatrix: Matrix4;
	private performance: PerformanceMetrics;

	constructor(canvas: HTMLCanvasElement, config: WebGLConfig) {
		this.canvas = canvas;
		this.buffers = new Map();
		this.extensions = new Map();
		this.viewMatrix = new Matrix4();
		this.projectionMatrix = new Matrix4();
		
		this.performance = {
			renderTime: 0,
			frameRate: 0,
			memoryUsage: 0,
			dataSize: 0,
			timestamp: Date.now()
		};

		this.initWebGL(config);
		this.initShaders();
		this.initExtensions();
	}

	private initWebGL(config: WebGLConfig): void {
		const context = this.canvas.getContext('webgl2', {
			antialias: config.antialias,
			alpha: config.alpha,
			premultipliedAlpha: config.premultipliedAlpha,
			preserveDrawingBuffer: config.preserveDrawingBuffer,
			powerPreference: config.powerPreference,
			failIfMajorPerformanceCaveat: config.failIfMajorPerformanceCaveat
		});

		if (!context) {
			throw new Error('WebGL2 not supported');
		}

		this.gl = context;

		// Configure WebGL state
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
	}

	private initShaders(): void {
		const vertexShaderSource = `#version 300 es
			precision highp float;

			in vec3 position;
			in vec3 color;
			in float size;

			uniform mat4 uViewMatrix;
			uniform mat4 uProjectionMatrix;
			uniform float uPointSize;
			uniform float uTime;

			out vec3 vColor;
			out float vSize;

			void main() {
				vec4 worldPosition = vec4(position, 1.0);
				gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
				gl_PointSize = size * uPointSize;
				
				vColor = color;
				vSize = size;
			}
		`;

		const fragmentShaderSource = `#version 300 es
			precision highp float;

			in vec3 vColor;
			in float vSize;

			uniform float uOpacity;
			uniform bool uUseTexture;

			out vec4 fragColor;

			void main() {
				vec2 center = gl_PointCoord - vec2(0.5);
				float dist = length(center);
				
				if (dist > 0.5) {
					discard;
				}
				
				float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
				fragColor = vec4(vColor, alpha * uOpacity);
			}
		`;

		const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

		this.program = this.gl.createProgram()!;
		this.gl.attachShader(this.program, vertexShader);
		this.gl.attachShader(this.program, fragmentShader);
		this.gl.linkProgram(this.program);

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			throw new Error('Shader program failed to link: ' + this.gl.getProgramInfoLog(this.program));
		}
	}

	private createShader(type: number, source: string): WebGLShader {
		const shader = this.gl.createShader(type)!;
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			throw new Error('Shader compilation failed: ' + this.gl.getShaderInfoLog(shader));
		}

		return shader;
	}

	private initExtensions(): void {
		const extensions = [
			'WEBGL_color_buffer_float',
			'OES_texture_float',
			'WEBGL_depth_texture',
			'EXT_color_buffer_half_float'
		];

		extensions.forEach(name => {
			const ext = this.gl.getExtension(name);
			if (ext) {
				this.extensions.set(name, ext);
			}
		});
	}

	/**
	 * Upload data to GPU buffers for high-performance rendering
	 */
	public uploadData(id: string, data: DataPoint[]): void {
		const startTime = performance.now();

		const positions = new Float32Array(data.length * 3);
		const colors = new Float32Array(data.length * 3);
		const sizes = new Float32Array(data.length);

		// Transform data to GPU-friendly format
		for (let i = 0; i < data.length; i++) {
			const point = data[i];
			const idx = i * 3;

			// Positions
			positions[idx] = point.x;
			positions[idx + 1] = point.y;
			positions[idx + 2] = point.z || 0;

			// Colors (normalized to 0-1)
			const hue = (point.value || 0) * 360;
			const rgb = this.hslToRgb(hue / 360, 0.7, 0.5);
			colors[idx] = rgb[0];
			colors[idx + 1] = rgb[1];
			colors[idx + 2] = rgb[2];

			// Sizes
			sizes[i] = Math.max(1, (point.value || 1) * 5);
		}

		// Create and bind buffers
		const positionBuffer = this.gl.createBuffer()!;
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

		const colorBuffer = this.gl.createBuffer()!;
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.STATIC_DRAW);

		const sizeBuffer = this.gl.createBuffer()!;
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, sizeBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.STATIC_DRAW);

		const indices = new Uint32Array(data.length);
		for (let i = 0; i < data.length; i++) {
			indices[i] = i;
		}

		const indexBuffer = this.gl.createBuffer()!;
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

		// Store buffer references
		this.buffers.set(id, {
			vertices: positions,
			indices: indices,
			colors: colors,
			size: data.length
		});

		// Update performance metrics
		this.performance.dataSize = data.length;
		this.performance.memoryUsage = (positions.byteLength + colors.byteLength + sizes.byteLength) / (1024 * 1024);
		
		const uploadTime = performance.now() - startTime;
		console.log(`Uploaded ${data.length} points in ${uploadTime.toFixed(2)}ms`);
	}

	/**
	 * Render the visualization with high performance
	 */
	public render(dataId: string, camera: { position: Vector3; target: Vector3 }): void {
		const startTime = performance.now();

		const buffer = this.buffers.get(dataId);
		if (!buffer) return;

		// Clear the canvas
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		// Use shader program
		this.gl.useProgram(this.program);

		// Update camera matrices
		this.updateCameraMatrices(camera);

		// Set uniforms
		const viewMatrixLocation = this.gl.getUniformLocation(this.program, 'uViewMatrix');
		const projectionMatrixLocation = this.gl.getUniformLocation(this.program, 'uProjectionMatrix');
		const pointSizeLocation = this.gl.getUniformLocation(this.program, 'uPointSize');
		const opacityLocation = this.gl.getUniformLocation(this.program, 'uOpacity');
		const timeLocation = this.gl.getUniformLocation(this.program, 'uTime');

		this.gl.uniformMatrix4fv(viewMatrixLocation, false, this.viewMatrix.elements);
		this.gl.uniformMatrix4fv(projectionMatrixLocation, false, this.projectionMatrix.elements);
		this.gl.uniform1f(pointSizeLocation, 2.0);
		this.gl.uniform1f(opacityLocation, 0.8);
		this.gl.uniform1f(timeLocation, Date.now() / 1000);

		// Bind vertex attributes
		this.bindVertexAttributes();

		// Draw points
		this.gl.drawElements(this.gl.POINTS, buffer.size, this.gl.UNSIGNED_INT, 0);

		// Update performance metrics
		const renderTime = performance.now() - startTime;
		this.performance.renderTime = renderTime;
		this.performance.frameRate = 1000 / renderTime;
		this.performance.timestamp = Date.now();
	}

	private updateCameraMatrices(camera: { position: Vector3; target: Vector3 }): void {
		// View matrix (camera transformation)
		this.viewMatrix.lookAt(camera.position, camera.target, new Vector3(0, 1, 0));

		// Projection matrix (perspective)
		const aspect = this.canvas.width / this.canvas.height;
		this.projectionMatrix.makePerspective(
			Math.PI / 4, // FOV
			aspect,
			0.1, // near
			1000 // far
		);
	}

	private bindVertexAttributes(): void {
		// Position attribute
		const positionLocation = this.gl.getAttribLocation(this.program, 'position');
		this.gl.enableVertexAttribArray(positionLocation);
		this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

		// Color attribute  
		const colorLocation = this.gl.getAttribLocation(this.program, 'color');
		this.gl.enableVertexAttribArray(colorLocation);
		this.gl.vertexAttribPointer(colorLocation, 3, this.gl.FLOAT, false, 0, 0);

		// Size attribute
		const sizeLocation = this.gl.getAttribLocation(this.program, 'size');
		this.gl.enableVertexAttribArray(sizeLocation);
		this.gl.vertexAttribPointer(sizeLocation, 1, this.gl.FLOAT, false, 0, 0);
	}

	private hslToRgb(h: number, s: number, l: number): [number, number, number] {
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs((h * 6) % 2 - 1));
		const m = l - c / 2;

		let r = 0, g = 0, b = 0;

		if (0 <= h && h < 1/6) {
			r = c; g = x; b = 0;
		} else if (1/6 <= h && h < 2/6) {
			r = x; g = c; b = 0;
		} else if (2/6 <= h && h < 3/6) {
			r = 0; g = c; b = x;
		} else if (3/6 <= h && h < 4/6) {
			r = 0; g = x; b = c;
		} else if (4/6 <= h && h < 5/6) {
			r = x; g = 0; b = c;
		} else if (5/6 <= h && h < 1) {
			r = c; g = 0; b = x;
		}

		return [r + m, g + m, b + m];
	}

	/**
	 * Resize the renderer when canvas size changes
	 */
	public resize(width: number, height: number): void {
		this.canvas.width = width;
		this.canvas.height = height;
		this.gl.viewport(0, 0, width, height);
	}

	/**
	 * Get current performance metrics
	 */
	public getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.performance };
	}

	/**
	 * Clean up WebGL resources
	 */
	public dispose(): void {
		// Delete buffers
		this.buffers.forEach((buffer, id) => {
			// WebGL buffers are automatically cleaned up when context is lost
		});
		this.buffers.clear();

		// Delete program and shaders
		if (this.program) {
			this.gl.deleteProgram(this.program);
		}
	}
}