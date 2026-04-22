import { NextRequest, NextResponse } from 'next/server';
import { connectDB, HolidayModel, getNextId } from '@/db/mongodb';

export async function GET() {
  await connectDB();

  const holidays = await HolidayModel.find({}, { __v: 0, _id: 0 }).sort({ start_date: 1 });
  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json();

  if (!body.title?.trim() || !body.start_date) {
    return NextResponse.json({ error: 'title and start_date required' }, { status: 400 });
  }

  const id = await getNextId('holidays');
  const holiday = await HolidayModel.create({
    id,
    title: body.title.trim(),
    start_date: body.start_date,
    end_date: body.end_date || null,
  });

  return NextResponse.json(
    {
      id: holiday.id,
      title: holiday.title,
      start_date: holiday.start_date,
      end_date: holiday.end_date ?? null,
      created_at: holiday.created_at,
    },
    { status: 201 },
  );
}
