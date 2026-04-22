import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TaskLinkModel, getNextId } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();

  const body = await req.json();

  if (!body.url?.trim()) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const maxOrderDoc = await TaskLinkModel.findOne(
    { task_id: params.id },
    { sort_order: 1 },
  ).sort({ sort_order: -1 });
  const maxOrder = maxOrderDoc?.sort_order ?? -1;

  const id = await getNextId('task_links');
  const link = await TaskLinkModel.create({
    id,
    task_id: params.id,
    url: body.url.trim(),
    label: body.label?.trim() || null,
    sort_order: maxOrder + 1,
  });

  return NextResponse.json(
    {
      id: link.id,
      task_id: link.task_id,
      url: link.url,
      label: link.label ?? null,
      sort_order: link.sort_order,
    },
    { status: 201 },
  );
}

export async function DELETE(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const linkId = searchParams.get('linkId');

  if (!linkId) {
    return NextResponse.json({ error: 'linkId required' }, { status: 400 });
  }

  await TaskLinkModel.deleteOne({ id: Number(linkId) });

  return NextResponse.json({ success: true });
}
