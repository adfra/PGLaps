import { listTasks, listTaskTypes } from '$lib/tasks/repository.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	const typeSlug = url.searchParams.get('type') ?? undefined;
	const search = url.searchParams.get('q') ?? undefined;

	const [tasks, taskTypes] = [
		listTasks({ typeSlug, search }),
		listTaskTypes()
	];

	return { tasks, taskTypes, activeType: typeSlug ?? null, search: search ?? '' };
};
