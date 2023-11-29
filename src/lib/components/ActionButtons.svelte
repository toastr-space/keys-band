<script>
	let imageSrc =
		'https://cdn.builder.io/api/v1/image/assets/TEMP/92b7c7f2-aaf6-4514-9024-439620f32ec7?apiKey=f7abd25632984a63bf82dda361df2c86&';
</script>

<div class="items-stretch flex w-full gap-3 mt-3">
	<button
		class="text-white hover:bg-surface-800 text-base font-medium leading-5 whitespace-nowrap justify-center bg-white bg-opacity-20 px-8 py-3 rounded-full"
	>
		Reject
	</button>
	<button
		class="bg-teal-400 hover:bg-teal-300 flex gap-2 px-20 py-3 rounded-full w-full place-content-center max-md:px-5"
	>
		<div class="text-black text-base font-medium leading-5">Confirm</div>
		<img
			loading="lazy"
			alt=""
			src={imageSrc}
			class="aspect-[1.5] object-contain object-center w-3 stroke-[1.4px] stroke-black overflow-hidden self-center shrink-0 max-w-full my-auto"
		/>
	</button>
</div>
