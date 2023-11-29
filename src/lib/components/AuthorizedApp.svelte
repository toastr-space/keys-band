<script lang="ts">
	import Icon from '@iconify/svelte';

	let daysLeft = 2;
</script>

<div
	class="justify-center items-stretch bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div class="justify-between items-stretch flex gap-0">
		<div
			class="text-white text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px] w-[252px]"
		>
			AUTHORIZED APP
		</div>
		<div class="text-teal-400 text-xs leading-4 whitespace-nowrap">
			{daysLeft} more days
		</div>
	</div>
	<div class="justify-between items-stretch flex gap-5 mt-2">
		<div class="text-white text-2xl font-semibold leading-7">coracle.social</div>
		<button class="btn btn-sm btn-ghost px-0 py-0">
			<Icon icon="mingcute:settings-2-line" width={26} class="opacity-40" />
		</button>
	</div>
</div>
