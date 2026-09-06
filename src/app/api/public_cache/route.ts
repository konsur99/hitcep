import { NextResponse } from 'next/server';
import { getPublicCache } from '@/lib/publicData';

// No need for edge caching directives here, because getPublicCache() uses unstable_cache
export async function GET() {
  try {
    const data = await getPublicCache();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Cache error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
