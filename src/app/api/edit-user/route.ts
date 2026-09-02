import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { checkRateLimit } from '@/lib/rateLimit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { success } = checkRateLimit(req);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const authHeader = req.headers.get('authorization');
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
    
    if (callerData?.role !== 'Developer' && !callerData?.permissions?.can_edit_account && !callerData?.permissions?.manage_accounts) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { uid, newPassword, newName, maxDevices } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID pengguna harus disertakan' }, { status: 400 });
    }

    const db = getFirestore();
    const updates: any = {};
    const authUpdates: any = {};

    if (newName) {
      updates.name = newName;
      authUpdates.displayName = newName;
    }
    
    // Hanya Developer yang boleh mengubah max_devices
    if (maxDevices !== undefined && callerData?.role === 'Developer') {
      updates.max_devices = parseInt(maxDevices);
    }
    
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      }
      authUpdates.password = newPassword;
    }

    // Update in Firebase Auth if needed
    if (Object.keys(authUpdates).length > 0) {
      await getAuth().updateUser(uid, authUpdates);
    }

    // Update in Firestore
    if (Object.keys(updates).length > 0) {
      await db.collection('users').doc(uid).update(updates);
    }

    return NextResponse.json({ success: true, message: 'Akun berhasil diperbarui' });
  } catch (error: any) {
    console.error('Error in edit-user:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat mengupdate akun' }, { status: 500 });
  }
}
