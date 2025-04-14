import axios from 'axios';
import type { User } from '../types';
import { list } from '@vercel/blob';
import { kv } from "@vercel/kv";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';
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
    // First try KV storage (fastest)
    const kvData = await kv.get<User[]>("leaderboard");
    if (kvData && kvData.length > 0) {
      return kvData;
    }

    // If KV fails, try Blob storage as backup
    try {
      const { blobs } = await list();
      const leaderboardBlob = blobs.find((b: { pathname: string }) => b.pathname === 'leaderboard.json');
      if (leaderboardBlob) {
        const response = await fetch(leaderboardBlob.url);
        const blobData = await response.json();
        if (blobData && blobData.length > 0) {
          // Update KV storage with Blob data for faster future access
          await kv.set("leaderboard", blobData);
          return blobData;
        }
      }
    } catch (blobError) {
      console.error('Failed to get data from Blob storage:', blobError);
    }

    // If no data found in either storage
    return [];
  } catch (error) {
    console.error('Error in fetchLeaderboard:', error);
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