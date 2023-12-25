import { web } from '$lib/utility';

if (window.nostr === undefined) {
	const script = document.createElement('script');
	script.setAttribute('async', 'false');
	script.setAttribute('type', 'text/javascript');
	script.setAttribute('src', web.runtime.getURL('assets/nostr-provider.js'));
	document.head.appendChild(script);
}

window.addEventListener('message', (event) => {
	if (event.source !== window || !event.data || event.data.ext !== 'keys.band') return;
	if (event.data.response === undefined || event.data.response === null) {
		const data = event.data || {};
		data['url'] = event.origin;
		web.runtime.sendMessage({ ...data }, (response) => {
			if (response.response !== undefined && response.response !== null) {
				window.postMessage(response, '*');
			}
		});
	}
});
