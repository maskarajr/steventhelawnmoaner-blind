import { NextResponse } from 'next/server';
import { fetchLeaderboard } from '../../../lib/neynar';
import { put } from '@vercel/blob/client';
import { type NextRequest } from 'next/server';
import { Receiver } from '@upstash/qstash';

// Note: We're using Edge runtime
export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 300;

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!
});

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

export async function POST(req: NextRequest) {
  try {
    // Get the signature from the Upstash-Signature header
    const signature = req.headers.get('upstash-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Get the raw body
    const body = await req.text();

    // Verify the signature using Upstash's receiver
    const isValid = await receiver.verify({
      signature,
      body,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // If signature is valid, refresh the leaderboard
    const result = await refreshLeaderboard();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
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