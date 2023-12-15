<script lang="ts">
	import Footer from './Footer.svelte';
	import { urlToDomain } from '$lib/stores/utils';
	import QRCode from 'qrcode';
	import { keyStore } from '$lib/stores/data';
	import { getPublicKey } from 'nostr-tools';
	import { web } from '$lib/stores/utils';

	let currentTab = { url: '' };
	web.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		var activeTab = tabs[0];
		currentTab = activeTab;
	});

	let qrcodeUrl: string = '';
	QRCode.toDataURL(getPublicKey($keyStore))
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
