<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import '../app.css';

	// Theme management
	let currentTheme = 'light';

	onMount(() => {
		// Load saved theme
		const savedTheme = localStorage.getItem('theme') || 'light';
		setTheme(savedTheme);

		// Listen for system theme changes
		if (window.matchMedia) {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', (e) => {
				if (currentTheme === 'auto') {
					setTheme('auto');
				}
			});
		}
	});

	function setTheme(theme: string) {
		currentTheme = theme;
		
		if (browser) {
			localStorage.setItem('theme', theme);
			
			let effectiveTheme = theme;
			if (theme === 'auto') {
				effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			}
			
			document.documentElement.setAttribute('data-theme', effectiveTheme);
		}
	}

	function toggleTheme() {
		const themes = ['light', 'dark', 'auto'];
		const currentIndex = themes.indexOf(currentTheme);
		const nextTheme = themes[(currentIndex + 1) % themes.length];
		setTheme(nextTheme);
	}
</script>

<svelte:head>
	<title>Data Visualization Platform</title>
	<meta name="description" content="High-performance data visualization with WebGL acceleration" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="/favicon.ico" />
</svelte:head>

<div class="app">
	<header class="app-header">
		<div class="header-content">
			<div class="logo">
				<h1>DataViz Platform</h1>
				<span class="version">v1.0.0</span>
			</div>
			
			<nav class="main-nav">
				<a href="/" class="nav-link">Dashboard</a>
				<a href="/charts" class="nav-link">Charts</a>
				<a href="/streaming" class="nav-link">Live Data</a>
				<a href="/export" class="nav-link">Export</a>
			</nav>
			
			<div class="header-actions">
				<button class="theme-toggle" on:click={toggleTheme} title="Toggle theme">
					{#if currentTheme === 'light'}
						🌙
					{:else if currentTheme === 'dark'}
						☀️
					{:else}
						🌓
					{/if}
				</button>
			</div>
		</div>
	</header>

	<main class="app-main">
		<slot />
	</main>

	<footer class="app-footer">
		<div class="footer-content">
			<p>&copy; 2024 Data Visualization Platform. Built with SvelteKit + D3.js + WebGL.</p>
			<div class="footer-links">
				<a href="/docs" class="footer-link">Documentation</a>
				<a href="/api" class="footer-link">API</a>
				<a href="/about" class="footer-link">About</a>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(:root) {
		/* Light theme colors */
		--color-bg-primary: #ffffff;
		--color-bg-secondary: #f8f9fa;
		--color-bg-tertiary: #e9ecef;
		--color-text: #212529;
		--color-text-secondary: #6c757d;
		--color-text-muted: #adb5bd;
		--color-primary: #007bff;
		--color-primary-hover: #0056b3;
		--color-secondary: #6c757d;
		--color-success: #28a745;
		--color-warning: #ffc107;
		--color-danger: #dc3545;
		--color-border: #dee2e6;
		--color-grid: #e9ecef;
		
		/* Shadows */
		--shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
		--shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
		--shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
		
		/* Border radius */
		--radius-sm: 0.25rem;
		--radius-md: 0.375rem;
		--radius-lg: 0.5rem;
		
		/* Transitions */
		--transition-fast: 0.15s ease-in-out;
		--transition-normal: 0.25s ease-in-out;
		--transition-slow: 0.35s ease-in-out;
	}

	:global([data-theme="dark"]) {
		/* Dark theme colors */
		--color-bg-primary: #1a1a1a;
		--color-bg-secondary: #2d2d2d;
		--color-bg-tertiary: #404040;
		--color-text: #ffffff;
		--color-text-secondary: #b3b3b3;
		--color-text-muted: #808080;
		--color-primary: #4dabf7;
		--color-primary-hover: #339af0;
		--color-secondary: #868e96;
		--color-success: #51cf66;
		--color-warning: #ffd43b;
		--color-danger: #ff6b6b;
		--color-border: #404040;
		--color-grid: #333333;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		background-color: var(--color-bg-secondary);
		color: var(--color-text);
		line-height: 1.5;
		transition: background-color var(--transition-normal), color var(--transition-normal);
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.app-header {
		background-color: var(--color-bg-primary);
		border-bottom: 1px solid var(--color-border);
		box-shadow: var(--shadow-sm);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 4rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.version {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background-color: var(--color-bg-tertiary);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.main-nav {
		display: flex;
		gap: 2rem;
	}

	.nav-link {
		color: var(--color-text-secondary);
		text-decoration: none;
		font-weight: 500;
		transition: color var(--transition-fast);
		padding: 0.5rem 0;
		border-bottom: 2px solid transparent;
	}

	.nav-link:hover,
	.nav-link:focus {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.theme-toggle {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.5rem;
		font-size: 1.2rem;
		cursor: pointer;
		transition: all var(--transition-fast);
		color: var(--color-text);
		background-color: var(--color-bg-secondary);
	}

	.theme-toggle:hover {
		background-color: var(--color-bg-tertiary);
		transform: scale(1.05);
	}

	.app-main {
		flex: 1;
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
		width: 100%;
	}

	.app-footer {
		background-color: var(--color-bg-primary);
		border-top: 1px solid var(--color-border);
		margin-top: auto;
	}

	.footer-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.footer-content p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.footer-links {
		display: flex;
		gap: 1.5rem;
	}

	.footer-link {
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color var(--transition-fast);
	}

	.footer-link:hover {
		color: var(--color-primary);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.header-content {
			padding: 0 0.5rem;
			height: 3.5rem;
		}

		.logo h1 {
			font-size: 1.25rem;
		}

		.main-nav {
			display: none;
		}

		.app-main {
			padding: 1rem 0.5rem;
		}

		.footer-content {
			flex-direction: column;
			text-align: center;
			gap: 0.5rem;
		}

		.footer-links {
			gap: 1rem;
		}
	}

	/* Performance optimizations */
	@media (prefers-reduced-motion: reduce) {
		:global(*) {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>