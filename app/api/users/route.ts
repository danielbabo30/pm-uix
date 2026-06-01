import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB, UserModel, getNextId } from '@/db/mongodb';

export async function GET() {
  try {
    await connectDB();
    const users = await UserModel.find(
      {},
      { password_hash: 0, __v: 0, _id: 0 },
    ).sort({ name: 1 });
    return NextResponse.json(users);
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
  await connectDB();

  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!body.password?.trim()) {
    return NextResponse.json({ error: 'סיסמה שדה חובה' }, { status: 400 });
  }
  if (!body.email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password.trim(), 10);
  const id = await getNextId('users');

  const user = await UserModel.create({
    id,
    name: body.name.trim(),
    email: body.email.trim(),
    role: body.role?.trim() || null,
    password_hash: passwordHash,
    can_see_master: body.can_see_master !== false ? 1 : 0,
    can_see_spec: body.can_see_spec !== false ? 1 : 0,
    can_see_design: body.can_see_design !== false ? 1 : 0,
    can_see_dev: body.can_see_dev !== false ? 1 : 0,
    can_see_qa: body.can_see_qa !== false ? 1 : 0,
    daily_hours: body.daily_hours != null ? Number(body.daily_hours) : null,
  });

  const result = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_admin: user.is_admin,
    can_see_master: user.can_see_master,
    can_see_spec: user.can_see_spec,
    can_see_design: user.can_see_design,
    can_see_dev: user.can_see_dev,
    can_see_qa: user.can_see_qa,
    daily_hours: user.daily_hours,
    created_at: user.created_at,
  };

  return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
