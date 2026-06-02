import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TaskModel, SprintModel } from '@/db/mongodb';

export interface SearchResultItem {
  id: string;
  title: string;
  responsible_team: string;
  status: string;
  is_archived: number;
  sprint_name?: string;   // only for archived
  sprint_id?: number;     // only for archived
}

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get('q')?.trim();
    if (!q || q.length < 2) return NextResponse.json([]);

    await connectDB();

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Fetch active tasks first, then archived — limit each bucket
    const [active, archived] = await Promise.all([
      TaskModel.find({
        is_archived: 0,
        $or: [{ title: regex }, { description: regex }],
      })
        .sort({ sequence: 1 })
        .limit(8)
        .select('_id title responsible_team status is_archived archived_sprint_id'),

      TaskModel.find({
        is_archived: { $ne: 0 },
        $or: [{ title: regex }, { description: regex }],
      })
        .sort({ sequence: -1 })
        .limit(5)
        .select('_id title responsible_team status is_archived archived_sprint_id'),
    ]);

    // Resolve sprint names for archived tasks
    const sprintIds = Array.from(new Set(archived.map((t: { archived_sprint_id: number | null }) => t.archived_sprint_id).filter(Boolean)));
    const sprintMap: Record<number, string> = {};
    if (sprintIds.length) {
      const sprints = await SprintModel.find({ id: { $in: sprintIds } }).select('id name');
      for (const s of sprints) sprintMap[s.id] = s.name;
    }

    const results: SearchResultItem[] = [
      ...active.map((t: { _id: string; title: string; responsible_team: string; status: string; is_archived: number }) => ({
        id:               t._id,
        title:            t.title,
        responsible_team: t.responsible_team,
        status:           t.status,
        is_archived:      t.is_archived,
      })),
      ...archived.map((t: { _id: string; title: string; responsible_team: string; status: string; is_archived: number; archived_sprint_id: number | null }) => ({
        id:               t._id,
        title:            t.title,
        responsible_team: t.responsible_team,
        status:           t.status,
        is_archived:      t.is_archived,
        sprint_name:      t.archived_sprint_id ? sprintMap[t.archived_sprint_id] : undefined,
        sprint_id:        t.archived_sprint_id ?? undefined,
      })),
    ];

    return NextResponse.json(results);
  } catch (err) {
    console.error('[GET /api/search]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
