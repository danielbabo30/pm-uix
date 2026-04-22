import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TaskModel, UserModel } from '@/db/mongodb';

function esc(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('archived') === '1';

    const filter = includeArchived ? {} : { is_archived: 0 };
    const tasks = await TaskModel.find(filter).sort({ sequence: 1 });

    // Resolve all user IDs to names
    const allUserIds = new Set<number>();
    for (const t of tasks) {
      if (t.assignee_id)     allUserIds.add(t.assignee_id);
      if (t.backend_dev_id)  allUserIds.add(t.backend_dev_id);
      if (t.frontend_dev_id) allUserIds.add(t.frontend_dev_id);
    }
    const users = allUserIds.size
      ? await UserModel.find({ id: { $in: Array.from(allUserIds) } })
      : [];
    const umap: Record<number, string> = {};
    for (const u of users) umap[u.id] = u.name;

    const HEADERS = [
      'מזהה', 'כותרת', 'תיאור', 'צוות', 'סטטוס', 'עדיפות',
      'גורם מבצע', 'מפתח BE', 'מפתח FE',
      'מאמץ BE (שע׳)', 'מאמץ FE (שע׳)',
      'בדיקות', 'דגל', 'בארכיון', 'נוצר',
    ];

    const rows: string[] = [
      '\uFEFF' + HEADERS.map(esc).join(','), // BOM for Excel
    ];

    for (const t of tasks) {
      const flagLabel = t.flag === 1 ? 'ספרינט קרוב' : t.flag === 2 ? 'דחיפות גבוהה' : '';
      rows.push([
        esc(t._id),
        esc(t.title),
        esc(t.description),
        esc(t.responsible_team),
        esc(t.status),
        esc(t.priority),
        esc(t.assignee_id     ? umap[t.assignee_id]     ?? '' : ''),
        esc(t.backend_dev_id  ? umap[t.backend_dev_id]  ?? '' : ''),
        esc(t.frontend_dev_id ? umap[t.frontend_dev_id] ?? '' : ''),
        esc(t.backend_effort),
        esc(t.frontend_effort),
        esc(t.tests_passed ? 'כן' : ''),
        esc(flagLabel),
        esc(t.is_archived ? 'כן' : ''),
        esc(t.created_at ? t.created_at.slice(0, 10) : ''),
      ].join(','));
    }

    const csv = rows.join('\r\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/tasks/export]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
