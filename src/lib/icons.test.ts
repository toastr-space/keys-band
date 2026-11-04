/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { icons } from './icons';

// every component's source, read by Vite at test time
const sources = import.meta.glob('/src/**/*.svelte', { query: '?raw', import: 'default', eager: true }) as Record<
	string,
	string
>;

describe('bundled icons', () => {
	it('include every icon the UI uses (run node scripts/generate-icons.mjs after adding one)', () => {
		const used = new Set<string>();
		for (const source of Object.values(sources))
			for (const [, name] of source.matchAll(/['"]([a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*)['"]/g))
				used.add(name);
		expect(used.size).toBeGreaterThan(20);
		expect([...used].filter((name) => !icons[name])).toEqual([]);
	});

	it('contain no scripts, event handlers or links', () => {
		for (const { body } of Object.values(icons)) expect(body).not.toMatch(/<script|\son\w+=|href=|url\(/i);
	});
});
