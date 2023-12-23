<script>
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { storePopup } from '@skeletonlabs/skeleton';

	import './styles.css';
	import { onMount } from 'svelte';
	import { NostrUtil } from '$lib/utility';
	import { profileController } from '$lib/controllers/profile.controller';

	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

	onMount(() => {
		profileController.loadDuration();
		NostrUtil.prepareRelayPool();
	});
</script>

<div class="flex flex-col h-screen w-full">
	<main class="flex-grow w-full">
		<slot />
	</main>
</div>
