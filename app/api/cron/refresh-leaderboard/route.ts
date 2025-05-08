import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { put } from '@vercel/blob';
import axios from 'axios';
import type { User } from '@/app/types';
import { fetchLeaderboard } from '@/app/lib/neynar';
import { REFRESH_INTERVAL } from '@/app/lib/constants';

// Config for Edge Runtime
export const runtime = "edge";

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

// Validation functions
function isValidUser(user: any): boolean {
  return (
    user &&
    typeof user.fid === 'number' &&
    typeof user.username === 'string' &&
    typeof user.displayName === 'string' &&
    typeof user.pfp === 'string' &&
    typeof user.points === 'number' &&
    !isNaN(user.points)
  );
}

function isValidPoints(points: number): boolean {
  return typeof points === 'number' && !isNaN(points) && isFinite(points);
}

async function refreshLeaderboard() {
  try {
    // Get existing leaderboard data
    let existingLeaderboard: User[] = [];
    try {
      existingLeaderboard = await fetchLeaderboard();
    } catch (error) {
      console.error('Error fetching existing leaderboard:', error);
      // If we can't fetch the existing leaderboard, try to get it from KV storage
      const kvLeaderboard = await kv.get("leaderboard");
      if (Array.isArray(kvLeaderboard)) {
        existingLeaderboard = kvLeaderboard;
      } else {
        throw new Error('Unable to retrieve existing leaderboard data');
      }
    }
    
    // Validate existing data
    if (!Array.isArray(existingLeaderboard)) {
      throw new Error('Invalid leaderboard data format');
    }

    const pointsMap = new Map<number, User>();
    
    // Populate points map with existing data and validate
    for (const user of existingLeaderboard) {
      if (!isValidUser(user)) {
        console.error('Invalid user data found:', user);
        continue;
      }
      pointsMap.set(user.fid, { ...user });
    }

    // If no existing data, throw error
    if (pointsMap.size === 0) {
      throw new Error('No existing leaderboard data found');
    }

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
    let hasChanges = false;

    // Process all point assignments from casts
    for (const cast of casts) {
      if (!cast.parent_author?.fid) continue;
      
      const pointMatch = cast.text.match(/([+-]\d+(?:\.\d{1,8})?)\s*lawn\s*points?/i);
      if (pointMatch) {
        const fid = cast.parent_author.fid;
        const points = parseFloat(pointMatch[1]);
        
        // Validate points
        if (!isValidPoints(points)) {
          console.error('Invalid points value found:', points, 'in cast:', cast.text);
          continue;
        }
        
        // Get or initialize user in points map
        let user = pointsMap.get(fid);
        if (!user) {
          user = {
            fid,
            username: '',
            displayName: '',
            pfp: '',
            points: 0
          };
          pointsMap.set(fid, user);
          usersToFetch.add(fid);
          hasChanges = true;
        }
        
        // Only update points if this is a new cast
        const castTimestamp = new Date(cast.timestamp).getTime();
        const lastUpdate = new Date(await kv.get("lastUpdate") || 0).getTime();
        
        if (castTimestamp > lastUpdate) {
          // Validate new total points
          const newTotal = user.points + points;
          if (!isValidPoints(newTotal)) {
            console.error('Invalid total points calculated:', newTotal, 'for user:', user.username);
            continue;
          }
          
          user.points = newTotal;
          hasChanges = true;
          
          pointsProcessed.push({
            fid,
            username: user.username || '',
            points,
            newTotal: user.points,
            timestamp: cast.timestamp
          });
        }
      }
    }

    // If no changes, return existing data
    if (!hasChanges) {
      return {
        success: true,
        message: "No new changes to process",
        data: existingLeaderboard,
        timestamp: await kv.get("lastUpdate"),
        stats: {
          totalUsers: existingLeaderboard.length,
          newUsersProcessed: 0,
          castsProcessed: casts.length,
          pointsProcessed: 0,
          pointsAssignments: []
        }
      };
    }

    // Add admin to fetch list if not in pointsMap
    if (!pointsMap.has(parseInt(ADMIN_FID))) {
      const adminFid = parseInt(ADMIN_FID);
      pointsMap.set(adminFid, {
        fid: adminFid,
        username: '',
        displayName: '',
        pfp: '',
        points: 0
      });
      usersToFetch.add(adminFid);
    }

    // Fetch user details for all users in the points map
    if (usersToFetch.size > 0) {
      console.log('Fetching details for users:', usersToFetch.size);
      const userResponse = await api.get('/user/bulk', {
        params: {
          fids: Array.from(usersToFetch).join(',')
        }
      });

      // Update users in points map with their details
      for (const user of userResponse.data.users) {
        const existingUser = pointsMap.get(user.fid);
        if (existingUser) {
          // Validate user data before updating
          if (!user.username || !user.display_name || !user.pfp_url) {
            console.error('Invalid user details received:', user);
            continue;
          }
          
          pointsMap.set(user.fid, {
            ...existingUser,
            username: user.username,
            displayName: user.display_name,
            pfp: user.pfp_url
          });
        }
      }

      // Update pointsProcessed with user details
      pointsProcessed.forEach(processed => {
        const user = pointsMap.get(processed.fid);
        if (user) {
          processed.username = user.username;
        }
      });
    }

    // Convert to array and sort by points
    const updatedLeaderboard = Array.from(pointsMap.values())
      .filter(isValidUser) // Final validation before storage
      .sort((a, b) => b.points - a.points);

    // Validate final data before storage
    if (updatedLeaderboard.length === 0) {
      throw new Error('No valid users in leaderboard after update');
    }

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
      message: "Leaderboard refreshed successfully",
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const leaderboard = await fetchLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    return NextResponse.json({ error: 'Failed to refresh leaderboard' }, { status: 500 });
  }
}

// Schedule the cron job to run every hour
export const config = {
  schedule: `*/${REFRESH_INTERVAL / (60 * 1000)} * * * *`,
};

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await refreshLeaderboard();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh leaderboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 