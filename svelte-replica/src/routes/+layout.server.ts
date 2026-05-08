import { seedDatabase } from '$lib/server/seed.js';

// Seed once on first request
let seeded = false;

export function load() {
	if (!seeded) {
		seedDatabase();
		seeded = true;
	}
}
