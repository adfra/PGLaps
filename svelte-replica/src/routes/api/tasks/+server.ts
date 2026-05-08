import { json, error } from '@sveltejs/kit';
import { listTasks, createTask } from '$lib/tasks/repository.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = ({ url }) => {
	const typeSlug = url.searchParams.get('type') ?? undefined;
	const typeId = url.searchParams.get('typeId')
		? parseInt(url.searchParams.get('typeId')!, 10)
		: undefined;
	const search = url.searchParams.get('q') ?? undefined;

	const tasks = listTasks({ typeSlug, typeId, search });
	return json(tasks);
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const b = body as Record<string, unknown>;
	if (!b.typeId || !b.name) error(400, 'typeId and name are required');

	const task = createTask({
		typeId: b.typeId as number,
		name: b.name as string,
		description: (b.description as string) ?? '',
		location: (b.location as string) ?? '',
		data: (b.data as Record<string, unknown>) ?? {},
		waypoints: (b.waypoints as unknown[]) ?? [],
		legs: (b.legs as unknown[]) ?? [],
		xctskContent: b.xctskContent as string | undefined
	});

	return json(task, { status: 201 });
};
