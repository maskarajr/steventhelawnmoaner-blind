import { NextResponse } from 'next/server';
import { fetchLeaderboard } from '../../../lib/neynar';
import { put } from '@vercel/blob/client';
import { Receiver } from '@upstash/qstash';

// Note: We're using Edge runtime
export const runtime = 'edge';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!
});

async function handler(req: Request) {
  try {
    // For POST requests, verify the signature
    if (req.method === 'POST') {
      const signature = req.headers.get('upstash-signature');
      if (!signature) {
        return NextResponse.json({ error: 'No signature found' }, { status: 401 });
      }
      
      // Get the raw body
      const body = await req.text();
      
      // Verify the signature
      const isValid = await receiver.verify({
        signature,
        body
      });

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
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
      message: 'Leaderboard refreshed successfully via QStash',
      blobUrl: blob.url,
      timestamp: new Date().toISOString(),
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

// Export the POST method with signature verification
export const POST = handler;

// Export the GET method for testing
export const GET = handler; 