<script>
  let duration = "DURATION";
  let allow = "Allow";
  let justOnce = "Just Once";
  let imageUrl =
    "https://cdn.builder.io/api/v1/image/assets/TEMP/196eb409-24eb-4f23-abc5-23fb9b6768b0?apiKey=f7abd25632984a63bf82dda361df2c86&";
</script>

<div
  class="justify-center items-stretch bg-black bg-opacity-30 flex w-full flex-col mt-3 p-4 rounded-2xl"
>
  <div
    class="text-white text-opacity-70 text-xs font-semibold leading-4 tracking-[2.4000000000000004px]"
  >
    {duration}
  </div>
  <div class="items-center flex justify-between gap-2 mt-2 pr-20 max-md:pr-5">
    <div class="text-white text-base leading-5 my-auto">{allow}</div>
    <div
      class="items-stretch bg-black bg-opacity-30 self-stretch flex justify-between gap-2 pl-3.5 pr-5 py-2 rounded-xl border-[1.4px] border-solid border-white border-opacity-20"
    >
      <div class="text-white text-base leading-5">{justOnce}</div>
      <img
        loading="lazy"
        src={imageUrl}
        alt=""
        class="aspect-[2.4] object-contain object-center w-3 stroke-[1.4px] stroke-white stroke-opacity-70 overflow-hidden self-center shrink-0 max-w-full my-auto"
      />
    </div>
  </div>
</div>
