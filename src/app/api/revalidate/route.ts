import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    // Rate limit to prevent abuse
    const { success } = checkRateLimit(request);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Purge cache for the entire site (layout)
    revalidatePath('/', 'layout');
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ revalidated: false, message: 'Error revalidating' }, { status: 500 });
  }
}

