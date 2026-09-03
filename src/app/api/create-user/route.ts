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
    
    if (callerData?.role !== 'Developer' && !callerData?.permissions?.can_add_account && !callerData?.permissions?.manage_accounts) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { email, password, name, role } = await request.json();
    
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user in Firebase Authentication
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: name,
    });
    
    // Save profile to Firestore
    await getAdminDb().collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, uid: userRecord.uid, message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
