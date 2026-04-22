import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TaskModel, formatTask, getUserBySession, recordHistory } from '@/db/mongodb';
import { TEAM_LABELS, STATUS_LABELS } from '@/lib/constants';

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const body: { toTeam: string; toStatus: string } = await req.json();

    const existing = await TaskModel.findById(params.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await TaskModel.findByIdAndUpdate(
      params.id,
      {
        $set: {
          responsible_team: body.toTeam,
          status: body.toStatus,
          updated_at: new Date().toISOString(),
        },
      },
      { new: true },
    );

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // ── History ───────────────────────────────────────────────────────────
    const token = req.cookies.get('pm-session')?.value;
    const sessionUser = token ? await getUserBySession(token) : null;
    const actorId   = sessionUser?.id   ?? null;
    const actorName = sessionUser?.name ?? 'משתמש';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromTeamLabel   = (TEAM_LABELS as any)[existing.responsible_team]  ?? existing.responsible_team;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toTeamLabel     = (TEAM_LABELS as any)[body.toTeam]                ?? body.toTeam;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toStatusLabel   = (STATUS_LABELS as any)[body.toStatus]            ?? body.toStatus;

    await recordHistory(
      params.id, actorId, actorName,
      `העברה: ${fromTeamLabel} → ${toTeamLabel} (${toStatusLabel})`,
    );

    const formatted = await formatTask(updated);
    return NextResponse.json(formatted);
  } catch (err) {
    console.error('[POST /api/tasks/[id]/transfer]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
