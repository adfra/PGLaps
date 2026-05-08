import { json, error } from '@sveltejs/kit';
import { listTaskTypes, createTaskType } from '$lib/tasks/repository.js';
import type { RequestHandler } from './$types.js';
import type { TaskFieldDef } from '$lib/types/index.js';

export const GET: RequestHandler = () => {
	return json(listTaskTypes());
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const b = body as Record<string, unknown>;
	if (!b.slug || !b.name) error(400, 'slug and name are required');

	const taskType = createTaskType({
		slug: b.slug as string,
		name: b.name as string,
		description: (b.description as string) ?? '',
		icon: (b.icon as string) ?? '📋',
		color: (b.color as string) ?? '#007bff',
		fieldSchema: (b.fieldSchema as TaskFieldDef[]) ?? []
	});

	return json(taskType, { status: 201 });
};
