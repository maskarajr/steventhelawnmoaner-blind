import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { list } from '@vercel/blob';

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Get the last update time from the request header
    const lastUpdateHeader = new URL(request.url).searchParams.get('lastUpdate');
    
    // Get current data and last update time from KV
    const [kvData, lastUpdate] = await Promise.all([
      kv.get<any[]>("leaderboard"),
      kv.get<string>("lastUpdate")
    ]);

    // If the client's last update matches server's, return 304 Not Modified
    if (lastUpdateHeader && lastUpdate && lastUpdateHeader === lastUpdate) {
      return new Response(null, { status: 304 });
    }

    if (kvData && kvData.length > 0) {
      return NextResponse.json({
        data: kvData,
        lastUpdate
      });
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
          return NextResponse.json({
            data: blobData,
            lastUpdate
          });
        }
      }
    } catch (blobError) {
      console.error('Failed to get data from Blob storage:', blobError);
    }

    // If no data found in either storage
    return NextResponse.json({
      data: [],
      lastUpdate: null
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
} 