import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import {
  connectDB,
  UserModel,
  CommentModel,
  TaskLinkModel,
  NotificationModel,
  formatTask,
  getNextId,
  getUserBySession,
  recordHistory,
} from '@/db/mongodb';
import { sendAssignmentEmail } from '@/lib/email';

type Params = { params: { id: string } };

// ── Field display labels ──────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  title:           'כותרת',
  status:          'סטטוס',
  priority:        'עדיפות',
  responsible_team:'צוות',
  assignee_id:     'גורם מבצע',
  backend_dev_id:  'מפתח BE',
  frontend_dev_id: 'מפתח FE',
  backend_effort:  'מאמץ BE',
  frontend_effort: 'מאמץ FE',
  effort:          'הערכת מאמץ',
  tests_passed:    'תרחישי בדיקות',
  description:     'תיאור',
  flag:            'דגל',
};

// Resolve numeric user IDs to names for history display
async function resolveUserName(id: number | null | undefined): Promise<string> {
  if (!id) return '—';
  const u = await UserModel.findOne({ id });
  return u?.name ?? String(id);
}

// ── GET ───────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const col = mongoose.connection.db!.collection('tasks');
    const numId2 = parseInt(params.id, 10);
    const orG: object[] = [{ _id: params.id }];
    if (!isNaN(numId2)) orG.push({ _id: numId2 });
    const task = await col.findOne({ $or: orG });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allComments = await CommentModel.find({ task_id: params.id }).sort({ created_at: 1 });
    const links = await TaskLinkModel.find({ task_id: params.id }).sort({ sort_order: 1 });

    const topLevel = allComments.filter((c) => !c.parent_comment_id);
    const replies = allComments.filter((c) => !!c.parent_comment_id);

    const commentTree = topLevel.map((c) => ({
      id: c.id,
      task_id: c.task_id,
      parent_comment_id: c.parent_comment_id ?? null,
      author_id: c.author_id ?? null,
      author_name: c.author_name ?? null,
      body: c.body,
      created_at: c.created_at,
      replies: replies
        .filter((r) => r.parent_comment_id === c.id)
        .map((r) => ({
          id: r.id,
          task_id: r.task_id,
          parent_comment_id: r.parent_comment_id ?? null,
          author_id: r.author_id ?? null,
          author_name: r.author_name ?? null,
          body: r.body,
          created_at: r.created_at,
          replies: [],
        })),
    }));

    const taskLinks = links.map((l) => ({
      id: l.id,
      task_id: l.task_id,
      url: l.url,
      label: l.label ?? null,
      sort_order: l.sort_order,
    }));

    const formatted = await formatTask(task);
    return NextResponse.json({ ...formatted, comments: commentTree, links: taskLinks });
  } catch (err) {
    console.error('[GET /api/tasks/[id]]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const body = await req.json();

    const col = mongoose.connection.db!.collection('tasks');
    const numId = parseInt(params.id, 10);
    const orClauses: object[] = [{ _id: params.id }];
    if (!isNaN(numId)) orClauses.push({ _id: numId });
    const existing = await col.findOne({ $or: orClauses });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = [
      'title', 'description', 'responsible_team', 'status', 'priority',
      'assignee_id', 'backend_dev_id', 'frontend_dev_id',
      'backend_effort', 'frontend_effort', 'effort', 'tests_passed', 'flag',
      'sort_order', 'wip_from_sprint_id', 'project_id', 'work_week',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (field in body) {
        updates[field] = body[field] ?? null;
      }
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    await col.updateOne({ _id: existing._id }, { $set: updates });
    const updated = await col.findOne({ _id: existing._id });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // ── Notifications + Email on assignment ──────────────────────────────
    const token = req.cookies.get('pm-session')?.value;
    const sessionUser = token ? await getUserBySession(token) : null;
    const actorName = sessionUser?.name ?? 'מישהו';

    // Fields that represent "assigning a person to a task"
    const assignmentFields: Array<{ field: string; label: string }> = [
      { field: 'assignee_id',    label: 'גורם מבצע'   },
      { field: 'backend_dev_id', label: 'מפתח Back-end' },
      { field: 'frontend_dev_id',label: 'מפתח Front-end' },
    ];

    for (const { field } of assignmentFields) {
      if (!(field in body)) continue;
      const newId  = body[field];
      const oldId  = (existing as Record<string, unknown>)[field];
      if (!newId || newId === oldId) continue;

      // In-app notification
      const notifId = await getNextId('notifications');
      await NotificationModel.create({
        id: notifId,
        user_id: newId,
        type: 'assignment',
        message: `שויכת למשימה #${params.id}: ${existing.title}`,
        link: `/?task=${params.id}`,
      });

      // Email — fire-and-forget (don't fail the request if email fails)
      const assignee = await UserModel.findOne({ id: newId });
      if (assignee?.email) {
        sendAssignmentEmail({
          toEmail:         assignee.email,
          toName:          assignee.name,
          taskId:          params.id,
          taskTitle:       existing.title,
          taskDescription: existing.description ?? null,
          assignedBy:      actorName,
        }).catch(err => console.error('[email:assignment]', err));
      }
    }

    // ── History ───────────────────────────────────────────────────────────
    const actorId = sessionUser?.id ?? null;

    const historyFields = [
      'title', 'description', 'responsible_team', 'status', 'priority',
      'assignee_id', 'backend_dev_id', 'frontend_dev_id',
      'backend_effort', 'frontend_effort', 'effort', 'tests_passed', 'flag',
    ];

    for (const field of historyFields) {
      if (!(field in updates)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldRaw = (existing as any)[field];
      const newRaw = updates[field];
      if (oldRaw === newRaw) continue;
      if (oldRaw == null && newRaw == null) continue;

      const label = FIELD_LABELS[field] ?? field;
      let action: string;

      if (field === 'description') {
        action = 'עדכון תיאור';
      } else if (field === 'tests_passed') {
        action = `תרחישי בדיקות: ${newRaw ? 'בוצעו ✓' : 'לא בוצעו'}`;
      } else if (field === 'flag') {
        const flagLabels: Record<number, string> = { 0: 'ללא דגל', 1: '🚩 דגל אחד', 2: '🚩🚩 שני דגלים' };
        action = `דגל: ${flagLabels[newRaw as number] ?? String(newRaw)}`;
      } else if (field === 'assignee_id' || field === 'backend_dev_id' || field === 'frontend_dev_id') {
        const oldName = await resolveUserName(oldRaw as number | null);
        const newName = await resolveUserName(newRaw as number | null);
        action = `${label}: ${oldName} → ${newName}`;
      } else {
        const oldStr = oldRaw != null ? String(oldRaw) : '—';
        const newStr = newRaw != null ? String(newRaw) : '—';
        action = `${label}: ${oldStr} → ${newStr}`;
      }

      await recordHistory(params.id, actorId, actorName, action);
    }

    const formatted = await formatTask(updated);
    return NextResponse.json(formatted);
  } catch (err) {
    console.error('[PATCH /api/tasks/[id]]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const col = mongoose.connection.db!.collection('tasks');
    const numIdD = parseInt(params.id, 10);
    const orD: object[] = [{ _id: params.id }];
    if (!isNaN(numIdD)) orD.push({ _id: numIdD });
    const toDelete = await col.findOne({ $or: orD });
    if (!toDelete) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const result = await col.deleteOne({ _id: toDelete._id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/tasks/[id]]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
