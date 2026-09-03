import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdminDb();
    const auth = getAdminAuth();
    return NextResponse.json({ success: true, dbDefined: !!db, authDefined: !!auth });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
