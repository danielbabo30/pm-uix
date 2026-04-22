import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getUserBySession } from '@/db/mongodb';

export async function GET(req: NextRequest) {
  await connectDB();

  const token = req.cookies.get('pm-session')?.value;
  if (!token) return NextResponse.json(null, { status: 401 });

  const user = await getUserBySession(token);
  if (!user) return NextResponse.json(null, { status: 401 });

  return NextResponse.json(user);
}
