<script>
	import en from 'javascript-time-ago/locale/en';
	import TimeAgo from 'javascript-time-ago';

	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { storePopup } from '@skeletonlabs/skeleton';

	import './styles.css';
	import { onMount } from 'svelte';
	import { NostrUtil } from '$lib/utility';
	import { profileController } from '$lib/controllers/profile.controller';

	TimeAgo.addDefaultLocale(en);

	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

	onMount(() => {
		// Set duration based on local storage
		profileController.loadDuration();

		NostrUtil.prepareRelayPool();
	});
</script>

<div class="flex flex-col h-screen w-full">
	<main class="flex-grow w-full">
		<slot />
	</main>
</div>
