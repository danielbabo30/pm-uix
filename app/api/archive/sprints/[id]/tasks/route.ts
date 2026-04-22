import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TaskModel, formatTask } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  await connectDB();

  const sprintId = Number(params.id);
  const tasks = await TaskModel.find({
    archived_sprint_id: sprintId,
    is_archived: 1,
  }).sort({ sequence: 1 });

  const formatted = await Promise.all(tasks.map((t) => formatTask(t)));
  return NextResponse.json(formatted);
}
