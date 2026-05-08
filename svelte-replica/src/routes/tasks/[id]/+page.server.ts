import { getTask } from '$lib/tasks/repository.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) error(404, 'Task not found');

	const task = getTask(id);
	if (!task) error(404, 'Task not found');

	return { task };
};
