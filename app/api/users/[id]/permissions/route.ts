import { NextRequest, NextResponse } from 'next/server';
import { connectDB, UserModel } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await connectDB();

  const numId = Number(params.id);
  const body = await req.json();

  const allowed = ['can_see_master', 'can_see_spec', 'can_see_design', 'can_see_dev', 'can_see_qa', 'is_admin'];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));

  if (!fields.length) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const updates: Record<string, number> = {};
  for (const field of fields) {
    updates[field] = body[field] ? 1 : 0;
  }

  const updated = await UserModel.findOneAndUpdate(
    { id: numId },
    { $set: updates },
    { new: true },
  );

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    is_admin: updated.is_admin,
    can_see_master: updated.can_see_master,
    can_see_spec: updated.can_see_spec,
    can_see_design: updated.can_see_design,
    can_see_dev: updated.can_see_dev,
    can_see_qa: updated.can_see_qa,
    daily_hours: updated.daily_hours,
    created_at: updated.created_at,
  });
}
