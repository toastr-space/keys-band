<script lang="ts">
	export let placeholder = '';
	export let value = '';
</script>

<input
	type="text"
	class="form-input rounded-full focus:border-gray-400 focus:ring-gray-400 text-stone-900 focus:text-black bg-white dark:text-gray-300 dark:focus:text-white dark:bg-stone-900 py-3 px-4 w-full"
	{placeholder}
	bind:value
	on:keydown={(e) => {}}
/>
