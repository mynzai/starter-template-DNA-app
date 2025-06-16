import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import type { ExportConfig, ExportFormat, DataPoint, ChartConfig } from '$types';

/**
 * Export service for generating high-quality chart exports
 * Supports PNG, SVG, PDF, and interactive HTML formats
 */
export class ExportService {
	private canvas: HTMLCanvasElement | null = null;
	private svgElement: SVGSVGElement | null = null;

	constructor() {
		// Initialize canvas for high-resolution rendering
		this.canvas = document.createElement('canvas');
	}

	/**
	 * Export chart to specified format
	 */
	public async export(
		element: HTMLElement,
		data: DataPoint[],
		config: ExportConfig,
		chartConfig: ChartConfig
	): Promise<void> {
		try {
			switch (config.format) {
				case 'png':
					await this.exportPNG(element, config);
					break;
				case 'svg':
					await this.exportSVG(element, config);
					break;
				case 'pdf':
					await this.exportPDF(element, config, chartConfig);
					break;
				case 'html':
					await this.exportHTML(element, data, config, chartConfig);
					break;
				case 'json':
					await this.exportJSON(data, config);
					break;
				default:
					throw new Error(`Unsupported export format: ${config.format}`);
			}
		} catch (error) {
			console.error('Export failed:', error);
			throw error;
		}
	}

	private async exportPNG(element: HTMLElement, config: ExportConfig): Promise<void> {
		const canvas = await html2canvas(element, {
			width: config.resolution.width,
			height: config.resolution.height,
			scale: config.resolution.scale,
			useCORS: true,
			allowTaint: false,
			backgroundColor: null,
			removeContainer: true,
			imageTimeout: 15000,
			logging: false
		});

		// Apply quality settings
		canvas.toBlob(
			(blob) => {
				if (blob) {
					saveAs(blob, this.getFileName(config, 'png'));
				}
			},
			'image/png',
			config.quality / 100
		);
	}

	private async exportSVG(element: HTMLElement, config: ExportConfig): Promise<void> {
		// Find SVG element within the chart
		const svgElement = element.querySelector('svg');
		if (!svgElement) {
			throw new Error('No SVG element found for export');
		}

		// Clone and prepare SVG for export
		const clonedSVG = svgElement.cloneNode(true) as SVGSVGElement;
		this.prepareSVGForExport(clonedSVG, config);

		// Convert to string
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(clonedSVG);
		
		// Add XML declaration and DOCTYPE
		const svgBlob = new Blob([
			'<?xml version="1.0" encoding="UTF-8"?>\n',
			'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n',
			svgString
		], { type: 'image/svg+xml' });

		saveAs(svgBlob, this.getFileName(config, 'svg'));
	}

	private async exportPDF(
		element: HTMLElement,
		config: ExportConfig,
		chartConfig: ChartConfig
	): Promise<void> {
		// Create high-resolution canvas
		const canvas = await html2canvas(element, {
			width: config.resolution.width,
			height: config.resolution.height,
			scale: config.resolution.scale,
			useCORS: true,
			backgroundColor: '#ffffff'
		});

		// Create PDF
		const pdf = new jsPDF({
			orientation: config.resolution.width > config.resolution.height ? 'landscape' : 'portrait',
			unit: 'px',
			format: [config.resolution.width, config.resolution.height]
		});

		// Add chart image
		const imgData = canvas.toDataURL('image/png', config.quality / 100);
		pdf.addImage(imgData, 'PNG', 0, 0, config.resolution.width, config.resolution.height);

		// Add metadata
		pdf.setProperties({
			title: chartConfig.title || 'Data Visualization',
			subject: chartConfig.subtitle || 'Generated Chart',
			author: 'Data Visualization Platform',
			creator: 'SvelteKit + D3.js',
			producer: 'PDF Export Service'
		});

		// Add chart information page if requested
		if (config.includeData) {
			this.addDataPage(pdf, chartConfig);
		}

		// Save PDF
		pdf.save(this.getFileName(config, 'pdf'));
	}

	private async exportHTML(
		element: HTMLElement,
		data: DataPoint[],
		config: ExportConfig,
		chartConfig: ChartConfig
	): Promise<void> {
		// Create standalone HTML with embedded chart
		const htmlContent = this.generateStandaloneHTML(element, data, config, chartConfig);
		
		const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
		saveAs(htmlBlob, this.getFileName(config, 'html'));
	}

	private async exportJSON(data: DataPoint[], config: ExportConfig): Promise<void> {
		const exportData = {
			metadata: {
				exportDate: new Date().toISOString(),
				format: 'json',
				version: '1.0',
				dataPoints: data.length
			},
			data: data,
			schema: this.generateDataSchema(data)
		};

		const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { 
			type: 'application/json' 
		});
		
		saveAs(jsonBlob, this.getFileName(config, 'json'));
	}

	private prepareSVGForExport(svg: SVGSVGElement, config: ExportConfig): void {
		// Set size attributes
		svg.setAttribute('width', config.resolution.width.toString());
		svg.setAttribute('height', config.resolution.height.toString());
		svg.setAttribute('viewBox', `0 0 ${config.resolution.width} ${config.resolution.height}`);

		// Add namespace declarations
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

		// Inline styles for better compatibility
		this.inlineStyles(svg);

		// Remove interactive elements
		this.removeInteractiveElements(svg);
	}

	private inlineStyles(svg: SVGSVGElement): void {
		const elements = svg.querySelectorAll('*');
		elements.forEach(element => {
			const computedStyle = window.getComputedStyle(element);
			let styleString = '';

			// Copy relevant styles
			const stylesToCopy = [
				'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
				'opacity', 'font-family', 'font-size', 'font-weight',
				'text-anchor', 'dominant-baseline'
			];

			stylesToCopy.forEach(property => {
				const value = computedStyle.getPropertyValue(property);
				if (value && value !== 'none' && value !== 'normal') {
					styleString += `${property}: ${value}; `;
				}
			});

			if (styleString) {
				element.setAttribute('style', styleString);
			}
		});
	}

	private removeInteractiveElements(svg: SVGSVGElement): void {
		// Remove event handlers and interactive elements
		const interactiveElements = svg.querySelectorAll('[onclick], [onmouseover], [onmouseout]');
		interactiveElements.forEach(element => {
			element.removeAttribute('onclick');
			element.removeAttribute('onmouseover');
			element.removeAttribute('onmouseout');
		});
	}

	private addDataPage(pdf: jsPDF, chartConfig: ChartConfig): void {
		pdf.addPage();
		
		// Add title
		pdf.setFontSize(16);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Chart Information', 20, 30);

		// Add chart details
		pdf.setFontSize(12);
		pdf.setFont('helvetica', 'normal');
		
		let yPos = 50;
		const lineHeight = 15;

		if (chartConfig.title) {
			pdf.text(`Title: ${chartConfig.title}`, 20, yPos);
			yPos += lineHeight;
		}

		if (chartConfig.subtitle) {
			pdf.text(`Subtitle: ${chartConfig.subtitle}`, 20, yPos);
			yPos += lineHeight;
		}

		pdf.text(`Chart Type: ${chartConfig.type}`, 20, yPos);
		yPos += lineHeight;

		pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, yPos);
		yPos += lineHeight;

		pdf.text(`Export Time: ${new Date().toLocaleTimeString()}`, 20, yPos);
	}

	private generateStandaloneHTML(
		element: HTMLElement,
		data: DataPoint[],
		config: ExportConfig,
		chartConfig: ChartConfig
	): string {
		const chartHTML = element.outerHTML;
		
		return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${chartConfig.title || 'Data Visualization'}</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			margin: 0;
			padding: 20px;
			background: #f8f9fa;
		}
		.container {
			max-width: 1200px;
			margin: 0 auto;
			background: white;
			border-radius: 8px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
			padding: 20px;
		}
		.header {
			margin-bottom: 20px;
			border-bottom: 1px solid #eee;
			padding-bottom: 15px;
		}
		.chart-container {
			width: 100%;
			height: ${config.resolution.height}px;
			overflow: hidden;
		}
		.metadata {
			margin-top: 20px;
			padding-top: 15px;
			border-top: 1px solid #eee;
			font-size: 0.9em;
			color: #666;
		}
	</style>
	${config.interactive ? this.getInteractiveScripts() : ''}
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>${chartConfig.title || 'Data Visualization'}</h1>
			${chartConfig.subtitle ? `<p>${chartConfig.subtitle}</p>` : ''}
		</div>
		
		<div class="chart-container">
			${chartHTML}
		</div>
		
		<div class="metadata">
			<p><strong>Export Information:</strong></p>
			<ul>
				<li>Generated: ${new Date().toLocaleString()}</li>
				<li>Chart Type: ${chartConfig.type}</li>
				<li>Data Points: ${data.length.toLocaleString()}</li>
				<li>Interactive: ${config.interactive ? 'Yes' : 'No'}</li>
			</ul>
		</div>
		
		${config.includeData ? `
		<div class="metadata">
			<p><strong>Data:</strong></p>
			<details>
				<summary>View Raw Data (${data.length} points)</summary>
				<pre>${JSON.stringify(data.slice(0, 100), null, 2)}${data.length > 100 ? '\n... and ' + (data.length - 100) + ' more points' : ''}</pre>
			</details>
		</div>
		` : ''}
	</div>
</body>
</html>`;
	}

	private getInteractiveScripts(): string {
		return `
		<script src="https://d3js.org/d3.v7.min.js"></script>
		<script>
			// Basic interactive functionality
			document.addEventListener('DOMContentLoaded', function() {
				console.log('Interactive chart loaded');
			});
		</script>
		`;
	}

	private generateDataSchema(data: DataPoint[]): any {
		if (data.length === 0) return {};

		const sample = data[0];
		const schema: any = {};

		Object.keys(sample).forEach(key => {
			const value = sample[key as keyof DataPoint];
			schema[key] = {
				type: typeof value,
				required: true
			};

			if (typeof value === 'number') {
				const values = data.map(d => d[key as keyof DataPoint] as number).filter(v => v != null);
				schema[key].min = Math.min(...values);
				schema[key].max = Math.max(...values);
			}
		});

		return schema;
	}

	private getFileName(config: ExportConfig, extension: string): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const baseName = config.filename || `chart-${timestamp}`;
		return `${baseName}.${extension}`;
	}

	/**
	 * Generate batch exports for multiple charts
	 */
	public async batchExport(
		exports: Array<{
			element: HTMLElement;
			data: DataPoint[];
			config: ExportConfig;
			chartConfig: ChartConfig;
		}>
	): Promise<void> {
		for (let i = 0; i < exports.length; i++) {
			const { element, data, config, chartConfig } = exports[i];
			
			// Add batch suffix to filename
			const batchConfig = {
				...config,
				filename: `${config.filename || 'chart'}-${i + 1}`
			};
			
			await this.export(element, data, batchConfig, chartConfig);
			
			// Small delay between exports to prevent browser throttling
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}
}