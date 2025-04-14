import axios from 'axios';
import type { User } from '../types';
import { list } from '@vercel/blob';

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';
const ADMIN_FID = process.env.NEXT_PUBLIC_ADMIN_FID || '262391';
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

if (!NEYNAR_API_KEY) {
  console.error('NEYNAR_API_KEY is not set in environment variables');
}

if (!BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set in environment variables');
}

// Cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();

  set(key: string, data: T) {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.store.delete(key);
      return null;
    }
    
    return entry.data;
  }
}

const repliesCache = new Cache<any[]>();
const userCache = new Cache<any>();
const leaderboardCache = new Cache<User[]>();

// API client
const api = axios.create({
  baseURL: 'https://api.neynar.com/v2/farcaster',
  headers: {
    'accept': 'application/json',
    'x-api-key': NEYNAR_API_KEY
  }
});

export async function fetchUserReplies(fid: number): Promise<any[]> {
  const cacheKey = `replies-${fid}`;
  const cached = repliesCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await api.get('/feed/user/casts', {
      params: {
        fid: fid,
        limit: 150,
        include_replies: true
      }
    });
    const replies = response.data.casts || [];
    repliesCache.set(cacheKey, replies);
    return replies;
  } catch (error) {
    console.error('Error fetching user replies:', error);
    return [];
  }
}

export async function fetchUserPoints(username: string): Promise<number> {
  const cacheKey = `points-${username}`;
  const cached = userCache.get(cacheKey);
  if (cached) return cached;

  try {
    // First get the user's FID
    const userResponse = await api.get('/user/by_username', {
      params: {
        username: username
      }
    });
    const user = userResponse.data.result.user;
    
    if (!user || !user.fid) {
      return 0;
    }

    // Get all replies by lawn.eth
    const replies = await fetchUserReplies(parseInt(ADMIN_FID));
    
    let points = 0;
    
    // Filter replies that are responses to the target user and contain point assignments
    for (const reply of replies) {
      // Skip if parent_author is missing or has no FID
      if (!reply.parent_author?.fid) continue;
      
      if (reply.parent_author.fid === user.fid) {
        const pointMatch = reply.text.match(/([+-]\d+)\s*lawn\s*points?/i);
        if (pointMatch) {
          points += parseInt(pointMatch[1]);
        }
      }
    }
    
    userCache.set(cacheKey, points);
    return points;
  } catch (error) {
    console.error('Error fetching user points:', error);
    return 0;
  }
}

export async function fetchLeaderboard(): Promise<User[]> {
  try {
    // Try to get from blob storage first
    try {
      const { blobs } = await list();
      const leaderboardBlob = blobs.find(b => b.pathname === 'leaderboard.json');
      if (leaderboardBlob) {
        const response = await fetch(leaderboardBlob.url);
        const cachedData = await response.json();
        return cachedData;
      }
    } catch (error) {
      console.log('No cached leaderboard data found, fetching fresh data');
    }

    // Get all replies by lawn.eth that contain point assignments
    const replies = await fetchUserReplies(parseInt(ADMIN_FID));
    
    // Map to store user points
    const userPoints = new Map<number, { points: number }>();
    const fidsToFetch = new Set<number>();
    
    // First pass: collect all FIDs and calculate points
    for (const reply of replies) {
      if (!reply.parent_author?.fid) continue;
      
      if (reply.text.match(/[+-]\d+\s*lawn\s*points?/i)) {
        const fid = reply.parent_author.fid;
        const pointMatch = reply.text.match(/([+-]\d+)\s*lawn\s*points?/i);
        
        if (pointMatch) {
          const points = parseInt(pointMatch[1]);
          const currentPoints = userPoints.get(fid)?.points || 0;
          userPoints.set(fid, { points: currentPoints + points });
          fidsToFetch.add(fid);
        }
      }
    }

    // Fetch all user details in bulk
    const fidsArray = Array.from(fidsToFetch);
    const userDetails = new Map<number, any>();
    
    if (fidsArray.length > 0) {
      try {
        const userResponse = await api.get('/user/bulk', {
          params: {
            fids: fidsArray.join(',')
          }
        });
        
        for (const user of userResponse.data.users) {
          userDetails.set(user.fid, user);
        }
      } catch (error) {
        console.error('Error fetching user details in bulk:', error);
      }
    }
    
    // Convert to array and format for return
    const leaderboard = Array.from(userPoints.entries())
      .map(([fid, data]) => {
        const user = userDetails.get(fid);
        if (!user) return null;
        
        return {
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          pfp: user.pfp_url,
          points: data.points
        };
      })
      .filter((entry): entry is User => entry !== null);
    
    // Sort by points in descending order
    const sortedLeaderboard = leaderboard.sort((a, b) => b.points - a.points);
    return sortedLeaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export async function fetchUserPointsFromBlob(username: string): Promise<number> {
  try {
    const { blobs } = await list();
    const leaderboardBlob = blobs.find(b => b.pathname === 'leaderboard.json');
    
    if (leaderboardBlob) {
      const response = await fetch(leaderboardBlob.url);
      const leaderboardData: User[] = await response.json();
      
      // Find user in the blob data
      const user = leaderboardData.find(
        u => u.username.toLowerCase() === username.toLowerCase()
      );
      
      return user?.points || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching points from blob:', error);
    return 0;
  }
}