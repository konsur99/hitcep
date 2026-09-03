import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const authModule = await import('firebase-admin/auth');
    return NextResponse.json({ success: true, keys: Object.keys(authModule) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
