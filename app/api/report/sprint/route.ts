import { NextResponse } from 'next/server';
import { connectDB, SprintModel, TaskModel, formatTask } from '@/db/mongodb';

export async function GET() {
  await connectDB();

  // Most recently completed sprint (highest sprint_number, sprint_order < 0)
  const completedSprint = await SprintModel.findOne(
    { sprint_order: { $lt: 0 } },
  ).sort({ sprint_number: -1 });

  // Current active sprint (sprint_order = 0)
  const currentSprint = await SprintModel.findOne({ sprint_order: 0 });

  if (!completedSprint) {
    return NextResponse.json({
      completedSprint: null,
      currentSprint: currentSprint
        ? {
            id: currentSprint.id,
            sprint_order: currentSprint.sprint_order,
            name: currentSprint.name,
            start_date: currentSprint.start_date ?? null,
            code_freeze_date: currentSprint.code_freeze_date ?? null,
            preprod_date: currentSprint.preprod_date ?? null,
            prod_date: currentSprint.prod_date ?? null,
            testing_start_date: currentSprint.testing_start_date ?? null,
            testing_end_date: currentSprint.testing_end_date ?? null,
            qa_date: currentSprint.qa_date ?? null,
            status: currentSprint.status,
            completed_at: currentSprint.completed_at ?? null,
            sprint_number: currentSprint.sprint_number ?? null,
            updated_at: currentSprint.updated_at,
          }
        : null,
      doneTasks: [],
      wipTasks: [],
      nextSprintTasks: [],
      backlogTasks: [],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function formatSprint(s: any) {
    return {
      id: s.id,
      sprint_order: s.sprint_order,
      name: s.name,
      start_date: s.start_date ?? null,
      code_freeze_date: s.code_freeze_date ?? null,
      preprod_date: s.preprod_date ?? null,
      prod_date: s.prod_date ?? null,
      testing_start_date: s.testing_start_date ?? null,
      testing_end_date: s.testing_end_date ?? null,
      qa_date: s.qa_date ?? null,
      status: s.status,
      completed_at: s.completed_at ?? null,
      sprint_number: s.sprint_number ?? null,
      updated_at: s.updated_at,
    };
  }

  // Group 1 — tasks archived in the completed sprint
  const doneRaw = await TaskModel.find({
    archived_sprint_id: completedSprint.id,
    is_archived: 1,
  }).sort({ sequence: 1 });
  const doneTasks = await Promise.all(doneRaw.map((t) => formatTask(t)));

  // Group 2 — WIP tasks (carried over from the completed sprint)
  const wipRaw = await TaskModel.find({
    wip_from_sprint_id: completedSprint.id,
    is_archived: 0,
  }).sort({ sequence: 1 });
  const wipTasks = await Promise.all(wipRaw.map((t) => formatTask(t)));

  // Group 3 — Next Sprint planning (current live board state)
  const nextRaw = await TaskModel.find({
    status: 'Next Sprint',
    responsible_team: 'Development',
    is_archived: 0,
  }).sort({ sort_order: 1, sequence: 1 });
  const nextSprintTasks = await Promise.all(nextRaw.map((t) => formatTask(t)));

  // Group 4 — Backlog (Awaiting Dev on dev board)
  const backlogRaw = await TaskModel.find({
    status: 'Awaiting Dev',
    responsible_team: 'Development',
    is_archived: 0,
  }).sort({ sort_order: 1, sequence: 1 });
  const backlogTasks = await Promise.all(backlogRaw.map((t) => formatTask(t)));

  return NextResponse.json({
    completedSprint: formatSprint(completedSprint),
    currentSprint: currentSprint ? formatSprint(currentSprint) : null,
    doneTasks,
    wipTasks,
    nextSprintTasks,
    backlogTasks,
  });
}
