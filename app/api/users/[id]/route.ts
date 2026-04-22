import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB, UserModel } from '@/db/mongodb';

type Params = { params: { id: string } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickUserFields(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_admin: user.is_admin,
    can_see_master: user.can_see_master,
    can_see_spec: user.can_see_spec,
    can_see_design: user.can_see_design,
    can_see_dev: user.can_see_dev,
    daily_hours: user.daily_hours,
    created_at: user.created_at,
  };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  await connectDB();

  const numId = Number(params.id);
  const body = await req.json();

  const existing = await UserModel.findOne({ id: numId });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed = ['name', 'email', 'role', 'daily_hours'];
  const updates: Record<string, unknown> = {};

  for (const field of allowed) {
    if (field in body) {
      if (field === 'daily_hours') {
        updates[field] = body[field] != null ? Number(body[field]) : null;
      } else {
        updates[field] = body[field] ?? null;
      }
    }
  }

  if (body.password?.trim()) {
    updates.password_hash = await bcrypt.hash(body.password.trim(), 10);
  }

  const updated = await UserModel.findOneAndUpdate(
    { id: numId },
    { $set: updates },
    { new: true },
  );

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(pickUserFields(updated));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await connectDB();

  const numId = Number(params.id);
  const result = await UserModel.deleteOne({ id: numId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
