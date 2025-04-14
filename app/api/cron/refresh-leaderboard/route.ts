import { NextResponse } from 'next/server';
import { fetchLeaderboard } from '../../../lib/neynar';
import { put } from '@vercel/blob/client';
import { type NextRequest } from 'next/server';
import { createHash } from 'crypto';

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

async function verifyQStashSignature(req: NextRequest) {
  const signature = req.headers.get('upstash-signature');
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signature) {
    throw new Error('No signature found');
  }

  if (!currentKey || !nextKey) {
    throw new Error('Missing QStash signing keys');
  }

  const body = await req.text();
  const hash = createHash('sha256').update(body).digest('base64');

  const isCurrentValid = signature === `${currentKey}${hash}`;
  const isNextValid = signature === `${nextKey}${hash}`;

  if (!isCurrentValid && !isNextValid) {
    throw new Error('Invalid signature');
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Verify QStash signature
    await verifyQStashSignature(req);
    
    // If verification passes, refresh leaderboard
    const result = await refreshLeaderboard();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 401 }
    );
  }
}

// Export GET for testing (no signature verification)
export async function GET(req: NextRequest) {
  try {
    const result = await refreshLeaderboard();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Failed to refresh leaderboard' },
      { status: 500 }
    );
  }
} 