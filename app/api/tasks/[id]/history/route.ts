import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TaskHistoryModel } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const entries = await TaskHistoryModel
      .find({ task_id: params.id }, { __v: 0, _id: 0 })
      .sort({ created_at: -1 });   // newest first

    return NextResponse.json(
      entries.map((e) => ({
        id:         e.id,
        task_id:    e.task_id,
        user_id:    e.user_id ?? null,
        user_name:  e.user_name,
        action:     e.action,
        created_at: e.created_at,
      })),
    );
  } catch (err) {
    console.error('[GET /api/tasks/[id]/history]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
