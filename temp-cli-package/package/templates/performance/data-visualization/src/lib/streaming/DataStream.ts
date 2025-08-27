import { writable, type Writable } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import type { StreamConfig, StreamMessage, StreamState, DataPoint } from '$types';

/**
 * Real-time data streaming service with WebSocket integration
 * Handles high-frequency data updates with buffering and throttling
 */
export class DataStream {
	private socket: Socket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimer: number | null = null;
	private messageBuffer: StreamMessage[] = [];
	private lastProcessTime = 0;
	
	// Svelte stores for reactive state
	public state: Writable<StreamState>;
	public data: Writable<DataPoint[]>;
	
	private config: StreamConfig;
	
	constructor(config: StreamConfig) {
		this.config = config;
		
		// Initialize stores
		this.state = writable({
			connected: false,
			reconnecting: false,
			error: null,
			latency: 0,
			messageCount: 0,
			dataRate: 0
		});
		
		this.data = writable([]);
	}

	/**
	 * Connect to the data stream
	 */
	public async connect(): Promise<void> {
		try {
			this.updateState({ reconnecting: true, error: null });
			
			if (this.config.protocol === 'websocket') {
				await this.connectWebSocket();
			} else if (this.config.protocol === 'sse') {
				await this.connectServerSentEvents();
			} else if (this.config.protocol === 'polling') {
				await this.startPolling();
			}
			
			this.startMessageProcessor();
			
		} catch (error) {
			this.handleError(error as Error);
		}
	}

	private async connectWebSocket(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket = io(this.config.url, {
				transports: ['websocket'],
				upgrade: false,
				rememberUpgrade: false,
				timeout: 10000,
				forceNew: true
			});

			this.socket.on('connect', () => {
				console.log('Connected to data stream');
				this.reconnectAttempts = 0;
				this.updateState({
					connected: true,
					reconnecting: false,
					error: null
				});
				resolve();
			});

			this.socket.on('disconnect', (reason) => {
				console.log('Disconnected from stream:', reason);
				this.updateState({ connected: false });
				
				if (this.config.reconnect && reason !== 'io client disconnect') {
					this.scheduleReconnect();
				}
			});

			this.socket.on('data', (message: StreamMessage) => {
				this.handleMessage(message);
			});

			this.socket.on('error', (error) => {
				console.error('Socket error:', error);
				reject(new Error(`WebSocket connection failed: ${error}`));
			});

			// Connection timeout
			setTimeout(() => {
				if (!this.socket?.connected) {
					reject(new Error('Connection timeout'));
				}
			}, 10000);
		});
	}

	private async connectServerSentEvents(): Promise<void> {
		return new Promise((resolve, reject) => {
			const eventSource = new EventSource(this.config.url);

			eventSource.onopen = () => {
				console.log('Connected to SSE stream');
				this.updateState({
					connected: true,
					reconnecting: false,
					error: null
				});
				resolve();
			};

			eventSource.onmessage = (event) => {
				try {
					const message: StreamMessage = JSON.parse(event.data);
					this.handleMessage(message);
				} catch (error) {
					console.error('Failed to parse SSE message:', error);
				}
			};

			eventSource.onerror = (error) => {
				console.error('SSE error:', error);
				this.updateState({ connected: false });
				
				if (this.config.reconnect) {
					this.scheduleReconnect();
				}
				
				reject(new Error('SSE connection failed'));
			};
		});
	}

	private async startPolling(): Promise<void> {
		const poll = async () => {
			try {
				const response = await fetch(this.config.url);
				if (!response.ok) {
					throw new Error(`Polling failed: ${response.statusText}`);
				}
				
				const data = await response.json();
				this.handleMessage({
					type: 'data',
					payload: data,
					timestamp: Date.now()
				});
				
			} catch (error) {
				console.error('Polling error:', error);
				this.handleError(error as Error);
			}
		};

		// Initial connection
		await poll();
		this.updateState({
			connected: true,
			reconnecting: false,
			error: null
		});

		// Schedule regular polling
		setInterval(poll, this.config.throttleMs || 1000);
	}

	private handleMessage(message: StreamMessage): void {
		// Add to buffer for processing
		this.messageBuffer.push(message);
		
		// Update message count
		this.updateState(state => ({
			...state,
			messageCount: state.messageCount + 1,
			latency: Date.now() - message.timestamp
		}));

		// Limit buffer size
		if (this.messageBuffer.length > this.config.bufferSize) {
			this.messageBuffer = this.messageBuffer.slice(-this.config.bufferSize);
		}
	}

	private startMessageProcessor(): void {
		const processMessages = () => {
			const now = Date.now();
			const timeSinceLastProcess = now - this.lastProcessTime;
			
			// Throttle processing based on config
			if (timeSinceLastProcess < this.config.throttleMs) {
				requestAnimationFrame(processMessages);
				return;
			}

			if (this.messageBuffer.length > 0) {
				const messagesToProcess = this.messageBuffer.splice(0, 100); // Process in batches
				this.processMessageBatch(messagesToProcess);
				this.lastProcessTime = now;
				
				// Calculate data rate
				const dataRate = messagesToProcess.length / (timeSinceLastProcess / 1000);
				this.updateState(state => ({ ...state, dataRate }));
			}

			requestAnimationFrame(processMessages);
		};

		requestAnimationFrame(processMessages);
	}

	private processMessageBatch(messages: StreamMessage[]): void {
		const newDataPoints: DataPoint[] = [];

		messages.forEach(message => {
			if (message.type === 'data') {
				if (Array.isArray(message.payload)) {
					newDataPoints.push(...message.payload);
				} else if (this.isDataPoint(message.payload)) {
					newDataPoints.push(message.payload);
				}
			} else if (message.type === 'error') {
				this.handleError(new Error(message.payload));
			}
		});

		if (newDataPoints.length > 0) {
			this.data.update(currentData => {
				const combined = [...currentData, ...newDataPoints];
				
				// Limit total data points for performance
				const maxPoints = this.config.bufferSize * 10;
				if (combined.length > maxPoints) {
					return combined.slice(-maxPoints);
				}
				
				return combined;
			});
		}
	}

	private isDataPoint(obj: any): obj is DataPoint {
		return obj && typeof obj.x === 'number' && typeof obj.y === 'number';
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.config.maxReconnects) {
			this.handleError(new Error('Maximum reconnection attempts reached'));
			return;
		}

		this.reconnectAttempts++;
		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff

		this.updateState({ reconnecting: true });

		this.reconnectTimer = window.setTimeout(() => {
			console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
			this.connect();
		}, delay);
	}

	private handleError(error: Error): void {
		console.error('Stream error:', error);
		this.updateState({ 
			error: error.message,
			connected: false,
			reconnecting: false
		});
	}

	private updateState(update: Partial<StreamState> | ((state: StreamState) => StreamState)): void {
		if (typeof update === 'function') {
			this.state.update(update);
		} else {
			this.state.update(state => ({ ...state, ...update }));
		}
	}

	/**
	 * Send data through the stream (if supported)
	 */
	public send(data: any): void {
		if (this.socket?.connected) {
			this.socket.emit('data', data);
		}
	}

	/**
	 * Disconnect from the stream
	 */
	public disconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}

		this.updateState({
			connected: false,
			reconnecting: false,
			error: null
		});
	}

	/**
	 * Clear all buffered data
	 */
	public clearData(): void {
		this.data.set([]);
		this.messageBuffer = [];
		this.updateState(state => ({
			...state,
			messageCount: 0,
			dataRate: 0
		}));
	}

	/**
	 * Get current stream statistics
	 */
	public getStats(): {
		bufferSize: number;
		messageRate: number;
		latency: number;
		dataPoints: number;
	} {
		let bufferSize = 0;
		let dataPoints = 0;
		let latency = 0;
		let messageRate = 0;

		this.state.subscribe(state => {
			latency = state.latency;
			messageRate = state.dataRate;
		})();

		this.data.subscribe(data => {
			dataPoints = data.length;
		})();

		bufferSize = this.messageBuffer.length;

		return {
			bufferSize,
			messageRate,
			latency,
			dataPoints
		};
	}

	/**
	 * Update stream configuration
	 */
	public updateConfig(newConfig: Partial<StreamConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}
}