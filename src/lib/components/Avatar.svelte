<script lang="ts">
	export let picture: string;
</script>

<div class="avatar">
	<div class="w-12 rounded-full shadow-lg">
		<img
			loading="lazy"
			src={picture || 'https://toastr.space/images/toastr.png'}
			alt="User profile"
		/>
	</div>
</div>
