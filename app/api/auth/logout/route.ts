import { NextRequest, NextResponse } from 'next/server';
import { connectDB, deleteSession } from '@/db/mongodb';

export async function POST(req: NextRequest) {
  await connectDB();

  const token = req.cookies.get('pm-session')?.value;
  if (token) {
    await deleteSession(token);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('pm-session', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}
