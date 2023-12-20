<script lang="ts">
	import Footer from './Footer.svelte';
	import QRCode from 'qrcode';

	import { userProfile } from '$lib/stores/data';

	let currentTab = { url: '' };

	let qrcodeUrl: string = '';
	QRCode.toDataURL($userProfile.data?.pubkey)
		.then((url) => {
			console.log(url);
			qrcodeUrl = url;
		})
		.catch((err) => {
			console.error(err);
		});
</script>

<div class="w-full h-full flex flex-row flex-col p-10 pt-5 space-y-6">
	<h1 class="text-center text-2xl font-bold font-sans">Public Key QR Code</h1>
	<div class="w-full">
		<center><img src={qrcodeUrl} alt="qrcode" width="190" /></center>
	</div>
</div>

<Footer />
