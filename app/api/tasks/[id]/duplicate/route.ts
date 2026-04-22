import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TaskModel, TaskLinkModel, getDuplicateTaskId, getNextId, getUserBySession, recordHistory } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();

  const original = await TaskModel.findById(params.id);
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const newId = await getDuplicateTaskId(original.sequence);

  await TaskModel.create({
    _id: newId,
    parent_id: original._id,
    sequence: original.sequence,
    title: original.title + ' (עותק)',
    description: original.description ?? null,
    responsible_team: original.responsible_team,
    status: original.status,
    priority: original.priority,
    assignee_id: original.assignee_id ?? null,
    backend_dev_id: original.backend_dev_id ?? null,
    frontend_dev_id: original.frontend_dev_id ?? null,
    backend_effort: original.backend_effort ?? null,
    frontend_effort: original.frontend_effort ?? null,
    tests_passed: original.tests_passed ?? 0,
    sort_order: (original.sort_order ?? 0) + 1,
    is_archived: 0,
  });

  // Copy all task links
  const links = await TaskLinkModel.find({ task_id: params.id });
  for (const link of links) {
    const linkId = await getNextId('task_links');
    await TaskLinkModel.create({
      id: linkId,
      task_id: newId,
      url: link.url,
      label: link.label ?? null,
      sort_order: link.sort_order,
    });
  }

  // Record history on the new (duplicated) task
  const token = req.cookies.get('pm-session')?.value;
  const sessionUser = token ? await getUserBySession(token) : null;
  await recordHistory(
    newId,
    sessionUser?.id ?? null,
    sessionUser?.name ?? 'משתמש',
    `שוכפל ממשימה #${params.id}`,
  );

  return NextResponse.json({ success: true });
}
