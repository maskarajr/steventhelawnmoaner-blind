import { NextResponse } from 'next/server';
import { fetchLeaderboard } from '../../lib/neynar';
import { put } from '@vercel/blob/client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to check if it's time to refresh (every 15 minutes)
function shouldRefresh() {
  const now = new Date();
  const minutes = now.getMinutes();
  return minutes % 15 === 0;
}

export async function GET() {
  try {
    // Check if it's time to refresh
    if (!shouldRefresh()) {
      return NextResponse.json({
        success: true,
        message: 'Not time to refresh yet',
        nextRefresh: new Date(Math.ceil(Date.now() / (15 * 60 * 1000)) * (15 * 60 * 1000))
      });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not set');
    }

    // Fetch fresh leaderboard data
    const leaderboard = await fetchLeaderboard();
    
    // Store in Vercel Blob
    const blob = await put('leaderboard.json', JSON.stringify(leaderboard), {
      access: 'public',
      token: blobToken
    });
    
    return NextResponse.json({
      success: true,
      message: 'Leaderboard refreshed successfully',
      blobUrl: blob.url,
      nextRefresh: new Date(Date.now() + 15 * 60 * 1000)
    });
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to refresh leaderboard' },
      { status: 500 }
    );
  }
} 