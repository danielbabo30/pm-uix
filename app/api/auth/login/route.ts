import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB, UserModel, createSession } from '@/db/mongodb';

export async function POST(req: NextRequest) {
  await connectDB();

  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'נדרשים מייל וסיסמה' }, { status: 400 });
  }

  const user = await UserModel.findOne({ email: email.trim() });

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: 'מייל או סיסמה שגויים' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'מייל או סיסמה שגויים' }, { status: 401 });
  }

  const token = await createSession(user.id);

  const res = NextResponse.json({ success: true, name: user.name });
  res.cookies.set('pm-session', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  return res;
}
