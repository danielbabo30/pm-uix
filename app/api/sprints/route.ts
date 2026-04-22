import { NextResponse } from 'next/server';
import { connectDB, SprintModel } from '@/db/mongodb';

export async function GET() {
  await connectDB();

  const sprints = await SprintModel.find(
    { sprint_order: { $gte: 0 } },
    { __v: 0, _id: 0 },
  ).sort({ sprint_order: 1 });

  return NextResponse.json(sprints);
}
