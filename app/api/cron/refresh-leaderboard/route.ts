import { NextResponse } from 'next/server';
import { fetchLeaderboard } from '../../../lib/neynar';
import { put } from '@vercel/blob/client';
import { verifySignature } from '@upstash/qstash/nextjs';

// Note: We're using Edge runtime
export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 300;

async function refreshLeaderboard() {
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
  
  return {
    success: true,
    message: 'Leaderboard refreshed successfully via QStash',
    blobUrl: blob.url,
    timestamp: new Date().toISOString(),
    nextRefresh: new Date(Date.now() + 15 * 60 * 1000)
  };
}

async function handler() {
  try {
    const result = await refreshLeaderboard();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in handler:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Export POST with QStash verification
export const POST = verifySignature(handler);

// Export GET for testing
export const GET = handler; 