import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SprintModel } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await connectDB();

  const numId = Number(params.id);
  const body = await req.json();

  const allowed = [
    'name', 'start_date', 'code_freeze_date',
    'preprod_date', 'prod_date',
    'testing_start_date', 'testing_end_date', 'qa_date',
  ];

  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const field of fields) {
    updates[field] = body[field] ?? null;
  }
  updates.updated_at = new Date().toISOString();

  const updated = await SprintModel.findOneAndUpdate(
    { id: numId },
    { $set: updates },
    { new: true },
  );

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: updated.id,
    sprint_order: updated.sprint_order,
    name: updated.name,
    start_date: updated.start_date ?? null,
    code_freeze_date: updated.code_freeze_date ?? null,
    preprod_date: updated.preprod_date ?? null,
    prod_date: updated.prod_date ?? null,
    testing_start_date: updated.testing_start_date ?? null,
    testing_end_date: updated.testing_end_date ?? null,
    qa_date: updated.qa_date ?? null,
    status: updated.status,
    completed_at: updated.completed_at ?? null,
    sprint_number: updated.sprint_number ?? null,
    updated_at: updated.updated_at,
  });
}
