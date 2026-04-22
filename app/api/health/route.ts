import { NextResponse } from 'next/server';
import { connectDB } from '@/db/mongodb';

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[health]', msg);
    return NextResponse.json({ status: 'error', error: msg }, { status: 500 });
  }
}
