import { NextResponse } from 'next/server';
import { fetchUserReplies } from '../../lib/neynar';

export async function GET() {
  try {
    const ADMIN_FID = process.env.NEXT_PUBLIC_ADMIN_FID || '262391';
    const casts = await fetchUserReplies(parseInt(ADMIN_FID));
    
    return NextResponse.json(casts, { status: 200 });
  } catch (error) {
    console.error('Error fetching casts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch casts' },
      { status: 500 }
    );
  }
} 