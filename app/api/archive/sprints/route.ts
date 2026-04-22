import { NextResponse } from 'next/server';
import { connectDB, SprintModel, TaskModel } from '@/db/mongodb';

export async function GET() {
  await connectDB();

  const sprints = await SprintModel.find(
    { sprint_order: { $lt: 0 } },
    { __v: 0, _id: 0 },
  ).sort({ sprint_number: -1 });

  const result = await Promise.all(
    sprints.map(async (sprint) => {
      const taskCount = await TaskModel.countDocuments({
        archived_sprint_id: sprint.id,
        is_archived: 1,
      });
      return {
        id: sprint.id,
        sprint_order: sprint.sprint_order,
        name: sprint.name,
        start_date: sprint.start_date ?? null,
        code_freeze_date: sprint.code_freeze_date ?? null,
        preprod_date: sprint.preprod_date ?? null,
        prod_date: sprint.prod_date ?? null,
        testing_start_date: sprint.testing_start_date ?? null,
        testing_end_date: sprint.testing_end_date ?? null,
        qa_date: sprint.qa_date ?? null,
        status: sprint.status,
        completed_at: sprint.completed_at ?? null,
        sprint_number: sprint.sprint_number ?? null,
        updated_at: sprint.updated_at,
        task_count: taskCount,
      };
    }),
  );

  return NextResponse.json(result);
}
