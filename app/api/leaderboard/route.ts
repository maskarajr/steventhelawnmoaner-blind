import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { list } from '@vercel/blob';

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Try KV storage first
    const kvData = await kv.get("leaderboard");
    const lastUpdate = await kv.get("lastUpdate");

    if (kvData && Array.isArray(kvData) && kvData.length > 0) {
      return NextResponse.json({
        data: kvData,
        lastUpdate
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
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
          // Get the last modified time from the blob
          const blobLastUpdate = new Date(leaderboardBlob.uploadedAt).toISOString();
          
          // Update KV storage with Blob data and timestamp
          await Promise.all([
            kv.set("leaderboard", blobData),
            kv.set("lastUpdate", blobLastUpdate)
          ]);
          
          return NextResponse.json({
            data: blobData,
            lastUpdate: blobLastUpdate
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
} 