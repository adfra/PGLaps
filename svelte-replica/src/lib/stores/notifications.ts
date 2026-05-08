import { writable } from 'svelte/store';
import type { Notification } from '$lib/types/index.js';

const { subscribe, update } = writable<Notification[]>([]);

export const notifications = {
	subscribe,
	add(message: string, type: Notification['type'] = 'info', duration = 3500) {
		const id = Math.random().toString(36).slice(2, 9);
		update((ns) => [...ns, { id, message, type }]);
		setTimeout(() => notifications.remove(id), duration);
	},
	remove(id: string) {
		update((ns) => ns.filter((n) => n.id !== id));
	}
};
