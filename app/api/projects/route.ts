import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ProjectModel, getNextId } from '@/db/mongodb';

export async function GET() {
  try {
    await connectDB();
    const projects = await ProjectModel.find().sort({ created_at: 1 });
    return NextResponse.json(projects.map(p => ({ id: p.id, name: p.name, created_at: p.created_at })));
  } catch (err) {
    console.error('[GET /api/projects]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'שם הפרויקט חסר' }, { status: 400 });
    const id = await getNextId('projects');
    const project = await ProjectModel.create({ id, name: name.trim() });
    return NextResponse.json({ id: project.id, name: project.name, created_at: project.created_at }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
