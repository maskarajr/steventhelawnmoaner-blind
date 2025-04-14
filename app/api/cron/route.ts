import { NextResponse } from 'next/server';
import { fetchLeaderboard } from '../../lib/neynar';
import { put } from '@vercel/blob';

// Add authorization check
async function isAuthorized(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  try {
    // Verify the request is authorized
    if (!await isAuthorized(req)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch fresh leaderboard data
    const leaderboard = await fetchLeaderboard();
    
    // Store in Vercel Blob
    const blob = await put('leaderboard.json', JSON.stringify(leaderboard), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
      allowOverwrite: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Leaderboard refreshed successfully',
      blobUrl: blob.url,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Failed to refresh leaderboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 