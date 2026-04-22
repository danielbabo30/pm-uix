import { NextRequest, NextResponse } from 'next/server';
import { connectDB, NotificationModel } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function PATCH(_req: NextRequest, { params }: Params) {
  await connectDB();
  await NotificationModel.findOneAndUpdate(
    { id: Number(params.id) },
    { $set: { is_read: 1 } },
  );
  return NextResponse.json({ success: true });
}
