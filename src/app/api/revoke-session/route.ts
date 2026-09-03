import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const { success } = checkRateLimit(request);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    const callerDoc = await getAdminDb().collection('users').doc(decodedToken.uid).get();
    const callerData = callerDoc.data();
    
    if (callerData?.role !== 'Developer' && !callerData?.permissions?.can_kill_session && !callerData?.permissions?.manage_accounts) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Revoke all refresh tokens for the user, forcing them to re-authenticate
    await getAdminAuth().revokeRefreshTokens(uid);

    return NextResponse.json({ success: true, message: 'Semua sesi pengguna berhasil diakhiri' });
  } catch (error: any) {
    console.error('Error revoking tokens:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengakhiri sesi' }, { status: 500 });
  }
}
