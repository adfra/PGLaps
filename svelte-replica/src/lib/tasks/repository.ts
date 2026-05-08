import { db } from '$lib/server/db.js';
import type { Task, TaskType, TaskFieldDef } from '$lib/types/index.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function parseType(row: Record<string, unknown>): TaskType {
	return {
		id: row.id as number,
		slug: row.slug as string,
		name: row.name as string,
		description: row.description as string,
		icon: row.icon as string,
		color: row.color as string,
		fieldSchema: JSON.parse(row.field_schema as string) as TaskFieldDef[],
		createdAt: row.created_at as string
	};
}

function parseTask(row: Record<string, unknown>, type?: TaskType): Task {
	return {
		id: row.id as number,
		typeId: row.type_id as number,
		type,
		name: row.name as string,
		description: row.description as string,
		location: row.location as string,
		data: JSON.parse(row.data as string),
		waypoints: JSON.parse(row.waypoints as string),
		legs: JSON.parse(row.legs as string),
		xctskContent: (row.xctsk_content as string | null) ?? undefined,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string
	};
}

// ── Task Types ────────────────────────────────────────────────────────────────

export function listTaskTypes(): TaskType[] {
	const rows = db.prepare('SELECT * FROM task_types ORDER BY name').all() as Record<
		string,
		unknown
	>[];
	return rows.map(parseType);
}

export function getTaskType(id: number): TaskType | undefined {
	const row = db.prepare('SELECT * FROM task_types WHERE id = ?').get(id) as
		| Record<string, unknown>
		| undefined;
	return row ? parseType(row) : undefined;
}

export function getTaskTypeBySlug(slug: string): TaskType | undefined {
	const row = db.prepare('SELECT * FROM task_types WHERE slug = ?').get(slug) as
		| Record<string, unknown>
		| undefined;
	return row ? parseType(row) : undefined;
}

export function createTaskType(data: {
	slug: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	fieldSchema: TaskFieldDef[];
}): TaskType {
	const result = db
		.prepare(
			`INSERT INTO task_types (slug, name, description, icon, color, field_schema)
       VALUES (@slug, @name, @description, @icon, @color, @fieldSchema)`
		)
		.run({
			...data,
			fieldSchema: JSON.stringify(data.fieldSchema)
		});
	return getTaskType(result.lastInsertRowid as number)!;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface ListTasksFilter {
	typeId?: number;
	typeSlug?: string;
	search?: string;
}

export function listTasks(filter: ListTasksFilter = {}): Task[] {
	let query = `
    SELECT t.*, tt.id as tt_id, tt.slug, tt.name as tt_name, tt.description as tt_desc,
           tt.icon, tt.color, tt.field_schema, tt.created_at as tt_created_at
    FROM tasks t
    JOIN task_types tt ON t.type_id = tt.id
    WHERE 1=1
  `;
	const params: unknown[] = [];

	if (filter.typeId) {
		query += ' AND t.type_id = ?';
		params.push(filter.typeId);
	}
	if (filter.typeSlug) {
		query += ' AND tt.slug = ?';
		params.push(filter.typeSlug);
	}
	if (filter.search) {
		query += ' AND (t.name LIKE ? OR t.location LIKE ? OR t.description LIKE ?)';
		const like = `%${filter.search}%`;
		params.push(like, like, like);
	}

	query += ' ORDER BY t.created_at DESC';

	const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
	return rows.map((row) => {
		const type = parseType({
			id: row.tt_id,
			slug: row.slug,
			name: row.tt_name,
			description: row.tt_desc,
			icon: row.icon,
			color: row.color,
			field_schema: row.field_schema,
			created_at: row.tt_created_at
		});
		return parseTask(row, type);
	});
}

export function getTask(id: number): Task | undefined {
	const row = db
		.prepare(
			`SELECT t.*, tt.id as tt_id, tt.slug, tt.name as tt_name, tt.description as tt_desc,
              tt.icon, tt.color, tt.field_schema, tt.created_at as tt_created_at
       FROM tasks t
       JOIN task_types tt ON t.type_id = tt.id
       WHERE t.id = ?`
		)
		.get(id) as Record<string, unknown> | undefined;

	if (!row) return undefined;

	const type = parseType({
		id: row.tt_id,
		slug: row.slug,
		name: row.tt_name,
		description: row.tt_desc,
		icon: row.icon,
		color: row.color,
		field_schema: row.field_schema,
		created_at: row.tt_created_at
	});
	return parseTask(row, type);
}

export function createTask(data: {
	typeId: number;
	name: string;
	description: string;
	location: string;
	data: Record<string, unknown>;
	waypoints?: unknown[];
	legs?: unknown[];
	xctskContent?: string;
}): Task {
	const result = db
		.prepare(
			`INSERT INTO tasks (type_id, name, description, location, data, waypoints, legs, xctsk_content)
       VALUES (@typeId, @name, @description, @location, @data, @waypoints, @legs, @xctskContent)`
		)
		.run({
			typeId: data.typeId,
			name: data.name,
			description: data.description,
			location: data.location,
			data: JSON.stringify(data.data),
			waypoints: JSON.stringify(data.waypoints ?? []),
			legs: JSON.stringify(data.legs ?? []),
			xctskContent: data.xctskContent ?? null
		});
	return getTask(result.lastInsertRowid as number)!;
}

export function updateTask(
	id: number,
	data: Partial<{
		name: string;
		description: string;
		location: string;
		data: Record<string, unknown>;
		waypoints: unknown[];
		legs: unknown[];
		xctskContent: string;
	}>
): Task | undefined {
	const fields: string[] = ['updated_at = datetime(\'now\')'];
	const params: Record<string, unknown> = { id };

	if (data.name !== undefined) {
		fields.push('name = @name');
		params.name = data.name;
	}
	if (data.description !== undefined) {
		fields.push('description = @description');
		params.description = data.description;
	}
	if (data.location !== undefined) {
		fields.push('location = @location');
		params.location = data.location;
	}
	if (data.data !== undefined) {
		fields.push('data = @data');
		params.data = JSON.stringify(data.data);
	}
	if (data.waypoints !== undefined) {
		fields.push('waypoints = @waypoints');
		params.waypoints = JSON.stringify(data.waypoints);
	}
	if (data.legs !== undefined) {
		fields.push('legs = @legs');
		params.legs = JSON.stringify(data.legs);
	}
	if (data.xctskContent !== undefined) {
		fields.push('xctsk_content = @xctskContent');
		params.xctskContent = data.xctskContent;
	}

	db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`).run(params);
	return getTask(id);
}

export function deleteTask(id: number): boolean {
	const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
	return result.changes > 0;
}
