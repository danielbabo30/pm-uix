import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, TaskModel, formatTask, getNextTaskId } from '@/db/mongodb';

const DEFAULT_STATUS: Record<string, string> = {
  Specification: 'Awaiting Spec',
  Design: 'Awaiting UX',
  Development: 'Awaiting Dev',
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const team = searchParams.get('team');

    const projectId = searchParams.get('project_id');

    const filter: Record<string, unknown> = { is_archived: { $ne: 1 } };
    if (team)      filter.responsible_team = team;
    if (projectId) filter.project_id = Number(projectId);

    const col = mongoose.connection.db.collection('tasks');
    const tasks = await col.find(filter).sort({ sequence: 1, sort_order: 1 }).toArray();

    const formatted = await Promise.all(tasks.map((t) => formatTask(t)));
    return NextResponse.json(formatted);
  } catch (err) {
    console.error('[GET /api/tasks]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const team: string = body.responsible_team || 'Specification';
    const status: string = body.status || DEFAULT_STATUS[team] || 'Awaiting Spec';

    const { id, sequence } = await getNextTaskId();

    const maxOrderDoc = await TaskModel.findOne(
      { responsible_team: team, status },
      { sort_order: 1 },
    ).sort({ sort_order: -1 });
    const maxOrder = maxOrderDoc?.sort_order ?? -1;

    const task = await TaskModel.create({
      _id: id,
      sequence,
      title: body.title.trim(),
      description: body.description || null,
      responsible_team: team,
      status,
      priority: body.priority || 'Medium',
      assignee_id: body.assignee_id || null,
      backend_dev_id: body.backend_dev_id || null,
      frontend_dev_id: body.frontend_dev_id || null,
      backend_effort: body.backend_effort || null,
      frontend_effort: body.frontend_effort || null,
      tests_passed: body.tests_passed ? 1 : 0,
      sort_order: maxOrder + 1,
    });

    const formatted = await formatTask(task);
    return NextResponse.json(formatted, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tasks]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
