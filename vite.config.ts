import { defineConfig, type ConfigEnv } from 'vite';
import type { PreRenderedChunk } from 'rollup';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = new URL('.', import.meta.url).pathname;

// Get target browser from environment variable (default: chrome)
const targetBrowser = process.env.BROWSER || 'chrome';
const isFirefox = targetBrowser === 'firefox';

export default defineConfig(({ command }: ConfigEnv) => {
	const isDev = command === 'serve';

	// Build input config
	const inputConfig: Record<string, string> = {
		popup: resolve(__dirname, 'popup.html'),
		background: resolve(__dirname, 'src/background.ts'),
		content: resolve(__dirname, 'src/content.ts'),
		restore: resolve(__dirname, 'restore.html'),
		sidepanel: resolve(__dirname, 'sidepanel.html')
	};

	return {
		base: './',
		plugins: [
			svelte(),
			viteStaticCopy({
				targets: [
					{
						src: isFirefox ? 'static/manifest.firefox.json' : 'static/manifest.json',
						dest: '.',
						rename: 'manifest.json'
					},
					{
						src: 'static/assets/*',
						dest: 'assets'
					},
					{
						src: 'static/favicon.png',
						dest: '.'
					}
				]
			})
		],
		build: {
			// Enable watch mode for development
			watch: isDev ? {} : null,
			rollupOptions: {
				input: inputConfig,
				output: {
					entryFileNames: (chunkInfo: PreRenderedChunk) => {
						if (chunkInfo.name === 'background') return 'background.js';
						if (chunkInfo.name === 'content') return 'content.js';
						if (chunkInfo.name === 'restore') return 'assets/restore.js';
						return 'assets/[name]-[hash].js';
					},
					chunkFileNames: 'assets/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash].[ext]',
					format: 'es'
				}
			},
			outDir: isFirefox ? 'build-firefox' : 'build',
			emptyOutDir: true,
			target: 'esnext',
			assetsDir: 'assets'
		},
		resolve: {
			alias: {
				$lib: resolve(__dirname, 'src/lib')
			}
		},
		define: {
			global: 'globalThis',
			__BROWSER__: JSON.stringify(targetBrowser)
		}
	};
});
