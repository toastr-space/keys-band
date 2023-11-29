<script>
	import Icon from '@iconify/svelte';
</script>

<div
	class="justify-center items-stretch bg-black bg-opacity-50 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
	<div
		class="text-white text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
	>
		AUTHORISATION
	</div>
	<div class="text-white text-2xl font-semibold leading-7 whitespace-nowrap mt-2">
		coracle.social
	</div>
	<div class="text-white text-base leading-5 whitespace-nowrap mt-2">would like to:</div>
	<div class="items-center flex justify-between gap-3 mt-2">
		<Icon icon="mdi:check" width={16} class="text-teal-400" />
		<div class="text-white text-base leading-5 self-stretch grow whitespace-nowrap">
			read your public key
		</div>
	</div>
	<div class="items-center flex justify-between gap-3 mt-2">
		<Icon icon="mdi:check" width={16} class="text-teal-400" />
		<div class="text-white text-base leading-5 self-stretch grow whitespace-nowrap">
			sign some events
		</div>
	</div>
	<div class="items-center flex justify-between gap-3 mt-2">
		<Icon icon="mdi:check" width={16} class="text-teal-400" />
		<div class="text-white text-base leading-5 self-stretch grow whitespace-nowrap">
			do some other stuff
		</div>
	</div>
</div>
