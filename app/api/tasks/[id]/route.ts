import { NextRequest, NextResponse } from 'next/server';
import {
  connectDB,
  TaskModel,
  UserModel,
  CommentModel,
  TaskLinkModel,
  NotificationModel,
  formatTask,
  getNextId,
  getUserBySession,
  recordHistory,
} from '@/db/mongodb';

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

    const task = await TaskModel.findById(params.id);
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

    const existing = await TaskModel.findById(params.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = [
      'title', 'description', 'responsible_team', 'status', 'priority',
      'assignee_id', 'backend_dev_id', 'frontend_dev_id',
      'backend_effort', 'frontend_effort', 'tests_passed', 'flag',
      'sort_order', 'wip_from_sprint_id',
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

    const updated = await TaskModel.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true },
    );

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // ── Notifications ─────────────────────────────────────────────────────
    if (
      'assignee_id' in body &&
      body.assignee_id != null &&
      body.assignee_id !== existing.assignee_id
    ) {
      const teamPaths: Record<string, string> = {
        Specification: 'spec',
        Design: 'design',
        Development: 'dev',
      };
      const team = updated.responsible_team ?? existing.responsible_team ?? '';
      const teamPath = teamPaths[team] ?? 'master';
      const notifId = await getNextId('notifications');
      await NotificationModel.create({
        id: notifId,
        user_id: body.assignee_id,
        type: 'assignment',
        message: `שויכת למשימה #${params.id}: ${existing.title}`,
        link: `/${teamPath}?open=${params.id}`,
      });
    }

    // ── History ───────────────────────────────────────────────────────────
    const token = req.cookies.get('pm-session')?.value;
    const sessionUser = token ? await getUserBySession(token) : null;
    const actorId   = sessionUser?.id   ?? null;
    const actorName = sessionUser?.name ?? 'משתמש';

    const historyFields = [
      'title', 'description', 'responsible_team', 'status', 'priority',
      'assignee_id', 'backend_dev_id', 'frontend_dev_id',
      'backend_effort', 'frontend_effort', 'tests_passed', 'flag',
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
    const result = await TaskModel.deleteOne({ _id: params.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/tasks/[id]]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
