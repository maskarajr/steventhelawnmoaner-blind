import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { put, list, del } from '@vercel/blob';
import axios, { AxiosResponse } from 'axios';
import type { User } from '@/app/types';

// Config for Edge Runtime
export const runtime = "edge";

// 15 minutes in milliseconds
const REFRESH_INTERVAL = 15 * 60 * 1000;

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const ADMIN_FID = process.env.NEXT_PUBLIC_ADMIN_FID || '262391';
const REFRESH_SECRET = process.env.REFRESH_SECRET;

interface NeynarCast {
  text: string;
  parent_author?: {
    fid: number;
  };
  timestamp: string;
}

interface NeynarResponse {
  casts: NeynarCast[];
  next?: {
    cursor: string;
  };
}

const api = axios.create({
  baseURL: 'https://api.neynar.com/v2/farcaster',
  headers: {
    'accept': 'application/json',
    'x-api-key': NEYNAR_API_KEY
  }
});

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.split(' ')[1] === REFRESH_SECRET) {
    return true;
  }
  const secretParam = request.nextUrl.searchParams.get('secret');
  return secretParam === REFRESH_SECRET;
}

// Function to reset storage
async function resetStorage() {
  try {
    // Clear KV storage
    await kv.del("leaderboard");
    await kv.del("lastUpdate");

    // Clear Blob storage
    const { blobs } = await list();
    const leaderboardBlob = blobs.find(b => b.pathname === 'leaderboard.json');
    if (leaderboardBlob) {
      await del('leaderboard.json', {
        token: process.env.BLOB_READ_WRITE_TOKEN!
      });
    }

    return true;
  } catch (error) {
    console.error('Error resetting storage:', error);
    return false;
  }
}

async function refreshLeaderboard(shouldReset = false) {
  try {
    // Reset storage if requested
    if (shouldReset) {
      console.log('Resetting storage...');
      await resetStorage();
    }

    // Initialize empty leaderboard
    const pointsMap = new Map<number, User>();

    // Fetch recent casts including replies
    const response = await api.get('/feed/user/casts', {
      params: {
        fid: ADMIN_FID,
        limit: 150,
        include_replies: true
      }
    });

    const casts = response.data.casts || [];
    const usersToFetch = new Set<number>();
    const pointsProcessed = [];

    // Process all point assignments from casts
    for (const cast of casts) {
      if (!cast.parent_author?.fid) continue;
      
      const pointMatch = cast.text.match(/([+-]\d+)\s*lawn\s*points?/i);
      if (pointMatch) {
        const fid = cast.parent_author.fid;
        const points = parseInt(pointMatch[1]);
        
        // Get or initialize user in points map
        const user = pointsMap.get(fid);
        if (user) {
          user.points += points;
          pointsProcessed.push({
            fid,
            username: user.username,
            points,
            newTotal: user.points,
            timestamp: cast.timestamp
          });
        } else {
          usersToFetch.add(fid);
          pointsProcessed.push({
            fid,
            points,
            status: 'new_user',
            timestamp: cast.timestamp
          });
        }
      }
    }

    // Add admin to fetch list if not in pointsMap
    if (!pointsMap.has(parseInt(ADMIN_FID))) {
      usersToFetch.add(parseInt(ADMIN_FID));
    }

    // Fetch user details for new users
    if (usersToFetch.size > 0) {
      console.log('Fetching details for new users:', usersToFetch.size);
      const userResponse = await api.get('/user/bulk', {
        params: {
          fids: Array.from(usersToFetch).join(',')
        }
      });

      // Add new users to points map
      for (const user of userResponse.data.users) {
        if (!pointsMap.has(user.fid)) {
          // Calculate total points for this new user from processed points
          const userPoints = pointsProcessed
            .filter(p => p.fid === user.fid)
            .reduce((total, p) => total + p.points, 0);

          pointsMap.set(user.fid, {
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
            pfp: user.pfp_url,
            points: userPoints || 0 // Initialize with 0 if no points found
          });
        }
      }
    }

    // Convert to array and sort by points
    const updatedLeaderboard = Array.from(pointsMap.values())
      .sort((a, b) => b.points - a.points);

    // Store in both KV and Blob
    const timestamp = new Date().toISOString();
    const [blobResult] = await Promise.all([
      put('leaderboard.json', JSON.stringify(updatedLeaderboard), { 
        access: 'public',
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN!,
        allowOverwrite: true
      }),
      kv.set("leaderboard", updatedLeaderboard),
      kv.set("lastUpdate", timestamp)
    ]);

    return {
      success: true,
      message: shouldReset ? "Storage reset and leaderboard refreshed" : "Leaderboard refreshed successfully",
      data: updatedLeaderboard,
      blobUrl: blobResult.url,
      timestamp,
      stats: {
        totalUsers: updatedLeaderboard.length,
        newUsersProcessed: usersToFetch.size,
        castsProcessed: casts.length,
        pointsProcessed: pointsProcessed.length,
        pointsAssignments: pointsProcessed
      }
    };
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const reset = request.nextUrl.searchParams.get('reset') === 'true';
    const result = await refreshLeaderboard(reset);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh leaderboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await refreshLeaderboard(false);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh leaderboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 