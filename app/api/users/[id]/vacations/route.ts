import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VacationModel, getNextId } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  await connectDB();

  const userId = Number(params.id);
  const vacations = await VacationModel.find(
    { user_id: userId },
    { __v: 0, _id: 0 },
  ).sort({ start_date: 1 });

  return NextResponse.json(vacations);
}

export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();

  const userId = Number(params.id);
  const body = await req.json();

  if (!body.start_date) {
    return NextResponse.json({ error: 'start_date required' }, { status: 400 });
  }

  const id = await getNextId('vacations');
  const vacation = await VacationModel.create({
    id,
    user_id: userId,
    start_date: body.start_date,
    end_date: body.end_date || null,
    note: body.note?.trim() || null,
  });

  return NextResponse.json(
    {
      id: vacation.id,
      user_id: vacation.user_id,
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      note: vacation.note,
      created_at: vacation.created_at,
    },
    { status: 201 },
  );
}
