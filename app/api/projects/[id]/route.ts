import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ProjectModel } from '@/db/mongodb';

type Params = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const result = await ProjectModel.deleteOne({ id: Number(params.id) });
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
