<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let { isToggled = false }: { isToggled?: boolean } = $props();
	const dispatch = createEventDispatcher();

	function toggle() {
		isToggled = !isToggled;
		dispatch('change', isToggled);
	}
</script>

<button
	class="justify-center flex flex-col rounded-3xl 2xl h-7 w-12"
	class:bg-pink-400={isToggled}
	class:bg-zinc-400={!isToggled}
	class:dark:bg-teal-400={isToggled}
	class:dark:bg-zinc-800={!isToggled}
	aria-label={isToggled ? 'Toggle switch enabled, click to disable' : 'Toggle switch disabled, click to enable'}
	on:click={toggle}
>
	<div
		class="justify-center bg-white flex flex-col rounded-full h-5 w-5 transition-all"
		class:ml-1={isToggled}
		class:ml-6={!isToggled}
		class:bg-opacity-60={!isToggled}
	></div>
</button>
