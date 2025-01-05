import { createApp } from 'vue';
import Grimoire from '@twentyfourg/grimoire/plugin';
import ui from './ui.vue';

window.onmessage = async (event) => {
	if(!event?.data?.pluginMessage) return;
	const { type } = event.data.pluginMessage;
	if(!type) return;
	console.log(event.data);
	if (type === 'copy') {
		const { text } = event.data.pluginMessage;
		copyToClipboard(text);
			// Notify the user of success/failure
	}

	// console.log(type);
	// if (type === 'save-file') {
	// }
	// if (type === 'save-zip') {
	// }
};


createApp(ui).use(Grimoire).mount('#ui');
