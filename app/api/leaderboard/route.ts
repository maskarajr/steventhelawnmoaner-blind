import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { list } from '@vercel/blob';

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // First try KV storage (fastest)
    const kvData = await kv.get<any[]>("leaderboard");
    if (kvData && kvData.length > 0) {
      return NextResponse.json(kvData);
    }

    // If KV fails, try Blob storage as backup
    try {
      const { blobs } = await list();
      const leaderboardBlob = blobs.find(b => b.pathname === 'leaderboard.json');
      if (leaderboardBlob) {
        const response = await fetch(leaderboardBlob.url);
        const blobData = await response.json();
        if (blobData && blobData.length > 0) {
          // Update KV storage with Blob data for faster future access
          await kv.set("leaderboard", blobData);
          return NextResponse.json(blobData);
        }
      }
    } catch (blobError) {
      console.error('Failed to get data from Blob storage:', blobError);
    }

    // If no data found in either storage
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
} 