<script>
  let imageSrc =
    "https://cdn.builder.io/api/v1/image/assets/TEMP/92b7c7f2-aaf6-4514-9024-439620f32ec7?apiKey=f7abd25632984a63bf82dda361df2c86&";
</script>

<div class="items-stretch flex w-full justify-between gap-3 mt-3">
  <div
    class="text-white text-base font-medium leading-5 whitespace-nowrap justify-center items-stretch bg-white bg-opacity-20 px-4 py-3 rounded-2xl"
  >
    Reject
  </div>
  <div
    class="justify-between items-stretch bg-teal-400 flex gap-2 px-20 py-3 rounded-2xl max-md:px-5"
  >
    <div class="text-black text-base font-medium leading-5">Confirm</div>
    <img
      loading="lazy"
      src={imageSrc}
      class="aspect-[1.5] object-contain object-center w-3 stroke-[1.4px] stroke-black overflow-hidden self-center shrink-0 max-w-full my-auto"
    />
  </div>
</div>
