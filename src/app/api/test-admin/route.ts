import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const admin = await import('firebase-admin/app');
    return NextResponse.json({ success: true, length: admin.getApps().length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
