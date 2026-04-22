import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SprintModel, TaskModel, getNextId } from '@/db/mongodb';

/**
 * POST /api/sprints/complete
 * Body: { decisions: { [taskId: string]: 'done' | 'next' | 'backlog' } }
 *
 * Steps:
 * 1. Apply per-task decisions (archive / move to Next Sprint / move to Awaiting Dev)
 * 2. Roll over: 'Next Sprint' → 'Current Sprint', 'Sprint After Next' → 'Next Sprint'
 * 3. Complete current sprint (sprint_order → -id, status → 'completed')
 * 4. Promote remaining active sprint orders (1→0, 2→1)
 * 5. Create new empty 'Sprint After Next' at order 2
 */
export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json();
  const decisions: Record<string, 'done' | 'next' | 'backlog'> = body.decisions ?? {};

  const currentSprint = await SprintModel.findOne({ sprint_order: 0 });
  if (!currentSprint) {
    return NextResponse.json({ error: 'No active current sprint' }, { status: 404 });
  }

  // 1. Apply task decisions
  for (const [taskId, decision] of Object.entries(decisions)) {
    if (decision === 'done') {
      await TaskModel.updateOne(
        { _id: taskId },
        { $set: { is_archived: 1, archived_sprint_id: currentSprint.id, status: 'Done' } },
      );
    } else if (decision === 'next') {
      await TaskModel.updateOne(
        { _id: taskId },
        { $set: { status: 'Next Sprint', wip_from_sprint_id: currentSprint.id } },
      );
    } else if (decision === 'backlog') {
      await TaskModel.updateOne(
        { _id: taskId },
        { $set: { status: 'Awaiting Dev' } },
      );
    }
  }

  // 2. Roll over statuses (non-archived tasks only)
  await TaskModel.updateMany(
    { status: 'Next Sprint', is_archived: 0 },
    { $set: { status: 'Current Sprint' } },
  );
  await TaskModel.updateMany(
    { status: 'Sprint After Next', is_archived: 0 },
    { $set: { status: 'Next Sprint' } },
  );

  // 3. Determine sprint_number for the completed sprint
  const maxNumDoc = await SprintModel.findOne(
    { sprint_number: { $exists: true, $ne: null } },
  ).sort({ sprint_number: -1 });
  const sprintNumber = (maxNumDoc?.sprint_number ?? 0) + 1;

  // 4. Mark current sprint completed
  await SprintModel.updateOne(
    { id: currentSprint.id },
    {
      $set: {
        sprint_order: -currentSprint.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        sprint_number: sprintNumber,
      },
    },
  );

  // 5. Promote active sprint orders: 1→0, 2→1
  await SprintModel.updateOne({ sprint_order: 1 }, { $set: { sprint_order: 0 } });
  await SprintModel.updateOne({ sprint_order: 2 }, { $set: { sprint_order: 1 } });

  // 6. Create new 'Sprint After Next' at order 2
  const newSprintId = await getNextId('sprints');
  await SprintModel.create({
    id: newSprintId,
    sprint_order: 2,
    name: 'ספרינט הבא הבא',
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
