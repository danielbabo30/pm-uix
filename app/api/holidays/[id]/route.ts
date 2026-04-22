import { NextRequest, NextResponse } from 'next/server';
import { connectDB, HolidayModel } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await connectDB();

  const numId = Number(params.id);
  const body = await req.json();

  const allowed = ['title', 'start_date', 'end_date'];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));

  if (!fields.length) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const field of fields) {
    updates[field] = body[field] ?? null;
  }

  const updated = await HolidayModel.findOneAndUpdate(
    { id: numId },
    { $set: updates },
    { new: true },
  );

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    start_date: updated.start_date ?? null,
    end_date: updated.end_date ?? null,
    created_at: updated.created_at,
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await connectDB();

  const numId = Number(params.id);
  await HolidayModel.deleteOne({ id: numId });

  return NextResponse.json({ success: true });
}
