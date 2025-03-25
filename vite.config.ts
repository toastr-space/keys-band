import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		sveltekit(),
		nodePolyfills({
			// Whether to polyfill `node:` protocol imports.
			protocolImports: true,
			// Include specific polyfills needed for the 'lrs' package
			include: ['buffer', 'crypto', 'util']
		})
	],
	build: {
		commonjsOptions: {
			// Handle dynamic requires for 'util' module
			transformMixedEsModules: true,
			// Define explicit targets for dynamic requires to ensure they're properly handled
			dynamicRequireTargets: [
				// Add any specific modules that might be using dynamic requires
				'node_modules/lrs/**/*.js'
			],
			// Ignore warnings from dynamic requires to prevent build failures
			ignore: ['conditional-runtime-dependency']
		}
	},
	optimizeDeps: {
		// Make sure Vite pre-bundles these dependencies to avoid dynamic require issues
		include: ['lrs'],
		// Force esbuild to use the nodePolyfills plugin for these dependencies
		esbuildOptions: {
			define: {
				global: 'globalThis'
			}
		}
	}
});
