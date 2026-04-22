import { NextRequest, NextResponse } from 'next/server';
import { connectDB, NotificationModel, getUserBySession } from '@/db/mongodb';

export async function GET(req: NextRequest) {
  await connectDB();

  const token = req.cookies.get('pm-session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserBySession(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notifs = await NotificationModel.find(
    { user_id: user.id },
    { __v: 0, _id: 0 },
  )
    .sort({ created_at: -1 })
    .limit(100);

  return NextResponse.json(notifs);
}

export async function PATCH(req: NextRequest) {
  await connectDB();

  const token = req.cookies.get('pm-session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserBySession(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await NotificationModel.updateMany(
    { user_id: user.id },
    { $set: { is_read: 1 } },
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  await connectDB();

  const token = req.cookies.get('pm-session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserBySession(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await NotificationModel.deleteMany({ user_id: user.id });

  return NextResponse.json({ success: true });
}
