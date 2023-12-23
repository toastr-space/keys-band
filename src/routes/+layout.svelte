<script>
	import './styles.css';

	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { profileController } from '$lib/controllers/profile.controller';
	import { storePopup } from '@skeletonlabs/skeleton';
	import { NostrUtil } from '$lib/utility';
	import { onMount } from 'svelte';

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
