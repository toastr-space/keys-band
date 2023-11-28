<script>
  import { onMount } from "svelte";

  let daysLeft = 2;

  onMount(() => {
    // Your logic here
  });
</script>

<div
  class="justify-center items-stretch bg-black bg-opacity-30 flex w-full flex-col mt-3 p-4 rounded-2xl"
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
    <div class="text-white text-2xl font-semibold leading-7">
      coracle.social
    </div>
    <img
      loading="lazy"
      src="https://cdn.builder.io/api/v1/image/assets/TEMP/56345f55-265f-4f07-ae46-d38f07e06956?apiKey=f7abd25632984a63bf82dda361df2c86&"
      class="aspect-square object-contain object-center w-4 stroke-[1.4px] stroke-white stroke-opacity-30 overflow-hidden self-center shrink-0 max-w-full my-auto"
    />
  </div>
</div>
