import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { checkRateLimit } from '@/lib/rateLimit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

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
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    const callerDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
    const callerData = callerDoc.data();
    
    if (callerData?.role !== 'Developer' && !callerData?.permissions?.can_kill_session && !callerData?.permissions?.manage_accounts) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Revoke all refresh tokens for the user, forcing them to re-authenticate
    await getAuth().revokeRefreshTokens(uid);

    return NextResponse.json({ success: true, message: 'Semua sesi pengguna berhasil diakhiri' });
  } catch (error: any) {
    console.error('Error revoking tokens:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengakhiri sesi' }, { status: 500 });
  }
}
