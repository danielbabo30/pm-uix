import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VacationModel } from '@/db/mongodb';

type Params = { params: { id: string; vacId: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  await connectDB();

  const vacId = Number(params.vacId);
  await VacationModel.deleteOne({ id: vacId });

  return NextResponse.json({ success: true });
}
