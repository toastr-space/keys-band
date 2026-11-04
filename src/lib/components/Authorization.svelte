<script lang="ts">
	import { onMount } from 'svelte';
	import { capabilityFor, describeCapability, loginDetails } from '$lib/utility/permissions';

	import Duration from './Duration.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let durationChoice = $state(0);
	let showRawEvent = $state(false);
	// Confirm ignores clicks until the window has been visible and focused for a moment, so a
	// click meant for the page underneath (e.g. the second half of a double-click) cannot land on it
	const ARM_DELAY_MS = 800;
	let armed = $state(false);

	let {
		domain,
		popupType,
		eventData,
		onaccepted,
		oncancel
	}: {
		domain: string;
		popupType: string;
		eventData?: any;
		onaccepted?: (event: { detail: { duration: number } }) => void;
		oncancel?: (event: { detail: { duration: number } }) => void;
	} = $props();

	const capability = $derived(capabilityFor(popupType, eventData));
	const details = $derived(popupType === 'signEvent' ? loginDetails(eventData) : []);
	const site = $derived.by(() => {
		try {
			const url = new URL(domain);
			return { scheme: url.protocol, host: url.host, insecure: url.protocol === 'http:' };
		} catch {
			return { scheme: '', host: domain, insecure: false };
		}
	});

	onMount(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const arm = () => {
			clearTimeout(timer);
			if (document.visibilityState === 'visible' && document.hasFocus())
				timer = setTimeout(() => (armed = true), ARM_DELAY_MS);
		};
		const disarm = () => {
			clearTimeout(timer);
			armed = false;
		};
		const onVisibility = () => (document.visibilityState === 'visible' ? arm() : disarm());
		window.addEventListener('focus', arm);
		window.addEventListener('blur', disarm);
		document.addEventListener('visibilitychange', onVisibility);
		arm();
		return () => {
			clearTimeout(timer);
			window.removeEventListener('focus', arm);
			window.removeEventListener('blur', disarm);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});
	const contentPreview = $derived(
		popupType === 'signEvent' && typeof eventData?.content === 'string'
			? eventData.content.length > 280
				? eventData.content.slice(0, 280) + '…'
				: eventData.content
			: ''
	);

	function handleDurationChange(event: { detail: { value: number } }) {
		durationChoice = event.detail.value;
	}

	// Format JSON with syntax highlighting
	function formatJsonWithHighlight(data: any): string {
		const json = JSON.stringify(data, null, 2);

		// We'll build the highlighted HTML by processing character by character
		let result = '';
		let i = 0;

		while (i < json.length) {
			const char = json[i];

			// Handle strings
			if (char === '"') {
				let str = '"';
				i++;
				while (i < json.length && json[i] !== '"') {
					if (json[i] === '\\' && i + 1 < json.length) {
						str += json[i] + json[i + 1];
						i += 2;
					} else {
						str += json[i];
						i++;
					}
				}
				str += '"';
				i++;

				// Escape HTML entities in the string content
				const escaped = str
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');

				// Check if this is a key (followed by colon)
				let j = i;
				while (j < json.length && (json[j] === ' ' || json[j] === '\t')) j++;

				if (json[j] === ':') {
					result += '<span style="color: #c084fc;">' + escaped + '</span>';
				} else {
					result += '<span style="color: #4ade80;">' + escaped + '</span>';
				}
			}
			// Handle numbers
			else if (char === '-' || (char >= '0' && char <= '9')) {
				let num = '';
				while (i < json.length && (json[i] === '-' || json[i] === '.' || (json[i] >= '0' && json[i] <= '9'))) {
					num += json[i];
					i++;
				}
				result += '<span style="color: #22d3ee;">' + num + '</span>';
			}
			// Handle booleans and null
			else if (json.substring(i, i + 4) === 'true') {
				result += '<span style="color: #facc15;">true</span>';
				i += 4;
			}
			else if (json.substring(i, i + 5) === 'false') {
				result += '<span style="color: #facc15;">false</span>';
				i += 5;
			}
			else if (json.substring(i, i + 4) === 'null') {
				result += '<span style="color: #9ca3af;">null</span>';
				i += 4;
			}
			// Handle other characters (brackets, colons, etc.)
			else {
				if (char === '<') result += '&lt;';
				else if (char === '>') result += '&gt;';
				else if (char === '&') result += '&amp;';
				else result += char;
				i++;
			}
		}

		return result;
	}
</script>

<div class="w-full h-full mx-auto flex flex-col mt-3">
	<!-- Scrollable content area -->
	<div class="flex-grow min-h-0 overflow-auto">
		<div
			class="justify-center kb-surface flex w-full flex-col p-4 rounded-2xl mx-auto"
		>
			<div
				class="text-gray-800 dark:text-gray-400 text-opacity-70 text-xs font-semibold leading-4 tracking-[3px]"
			>
				AUTHORIZATION
			</div>
			<!-- the whole origin, wrapped, so a look-alike such as primal.net.example.com is never cut short -->
			<div class="mt-2 break-all leading-7">
				<span class="text-gray-500 dark:text-gray-400 text-base">{site.scheme}//</span><span
					class="text-black dark:text-white text-2xl font-semibold">{site.host}</span
				>
			</div>
			{#if site.insecure}
				<div class="mt-2 text-xs p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
					Not secure (http): anyone on your network can change what this page sends.
				</div>
			{/if}
			{#if site.host.includes('xn--')}
				<div class="mt-2 text-xs p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
					This address uses international characters; check it is the site you expect.
				</div>
			{/if}
			<div class="text-black dark:text-white text-base leading-5 whitespace-nowrap mt-2">
				would like to:
			</div>
			<div class="items-center flex justify-between gap-3 mt-2">
				<Icon icon="mdi:check" width={16} class="text-pink-600 dark:text-teal-400" />
				<div
					class="text-black dark:text-white text-base leading-5 self-stretch grow whitespace-nowrap"
				>
					{capability ? describeCapability(capability) : popupType}
				</div>
			</div>
			{#if details.length > 0}
				<div class="mt-3 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm text-black dark:text-white break-all">
					{#each details as line}
						<div>{line}</div>
					{/each}
				</div>
			{/if}
			{#if popupType === 'signEvent' && eventData}
				{#if contentPreview}
					<div
						class="mt-3 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-sm text-black dark:text-white whitespace-pre-wrap break-words max-h-[120px] overflow-auto"
					>
						{contentPreview}
					</div>
				{/if}
				<div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
					{eventData.tags?.length || 0} tag(s)
				</div>
			{/if}
			{#if capability}
				<div class="mt-3 text-xs text-gray-600 dark:text-gray-400">
					A remembered choice applies only to “{describeCapability(capability)}” on {domain}.
				</div>
			{/if}

			<!-- Raw Event Dropdown -->
			{#if eventData && (popupType === 'signEvent' || popupType === 'nip04.encrypt' || popupType === 'nip04.decrypt')}
				<div class="mt-3">
					<button
						class="w-full flex items-center justify-between text-left text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors py-2"
						onclick={() => showRawEvent = !showRawEvent}
					>
						<span class="flex items-center gap-2">
							<Icon icon="mdi:code-json" width={16} />
							<span>View raw event</span>
						</span>
						<Icon icon={showRawEvent ? "mdi:chevron-up" : "mdi:chevron-down"} width={20} />
					</button>

					{#if showRawEvent}
						<div class="mt-2 p-3 bg-zinc-800 rounded-lg overflow-auto max-h-[300px] border border-zinc-600">
							<pre class="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all text-gray-100">{@html formatJsonWithHighlight(eventData)}</pre>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Fixed footer with Duration and buttons -->
	<div class="flex-shrink-0 pt-3">
		<Duration on:durationChange={handleDurationChange} />

		<div class="items-stretch flex w-full gap-3 mt-3">
			<button
				class="btn text-black dark:text-white bg-surface-400 font-medium leading-5 whitespace-nowrap justify-center bg-opacity-20 px-8 py-3 rounded-full"
				onclick={() => oncancel?.({ detail: { duration: durationChoice } })}
			>
				Reject
			</button>
			<button
				class="btn bg-pink-400 dark:bg-teal-400 flex gap-2 px-20 py-3 rounded-full w-full place-content-center max-md:px-5"
				disabled={!armed}
				onclick={() => armed && onaccepted?.({ detail: { duration: durationChoice } })}
			>
				<div class="text-black text-base font-medium leading-5">Confirm</div>
				<Icon icon="mdi:check" width={20} class="text-black" />
			</button>
		</div>
	</div>
</div>
