<script>
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { storePopup } from '@skeletonlabs/skeleton';
	import './styles.css';

	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
</script>

<div class="flex flex-col h-screen w-full">
	<main class="flex-grow w-full">
		<slot />
	</main>
</div>
