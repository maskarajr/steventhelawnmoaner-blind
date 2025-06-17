import axios from 'axios';
import type { User } from '../types';

const ADMIN_FID = process.env.NEXT_PUBLIC_ADMIN_FID || '262391';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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

async function callNeynarApi(endpoint: string, params: any) {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : (process.env.NEXT_PUBLIC_HOST || (typeof window !== 'undefined' ? window.location.origin : ''));
  
  const response = await fetch(`${baseUrl}/api/neynar-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, params })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch from Neynar');
  }

  return response.json();
}

export async function fetchUserReplies(fid: number): Promise<any[]> {
  const cacheKey = `replies-${fid}`;
  const cached = repliesCache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await callNeynarApi('/feed/user/casts', {
      fid,
      limit: 150,
      include_replies: true
    });
    const replies = data.casts || [];
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
    const userData = await callNeynarApi('/user/by_username', {
      username: username
    });
    const user = userData.result.user;
    
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

let lastUpdateTime: string | null = null;

export async function fetchLeaderboard(): Promise<User[]> {
  try {
    // Determine base URL based on environment
    let baseUrl: string;
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000';
    } else if (process.env.NEXT_PUBLIC_HOST) {
      baseUrl = process.env.NEXT_PUBLIC_HOST;
    } else if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
    } else {
      // Server-side fallback
      baseUrl = 'https://steventhelawnmoaner.vercel.app';
    }

    const url = new URL('/api/leaderboard', baseUrl);
    // Add cache-busting parameter
    url.searchParams.set('t', Date.now().toString());

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status} ${response.statusText}`);
    }
    
    const { data } = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid leaderboard data format received');
    }
    return data;
  } catch (error) {
    console.error('Error in fetchLeaderboard:', error);
    throw error;
  }
}

export async function fetchUserPointsFromBlob(username: string): Promise<number> {
  try {
    const leaderboardData = await fetchLeaderboard();
    const user = leaderboardData.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );
    return user?.points || 0;
  } catch (error) {
    console.error('Error fetching points:', error);
    return 0;
  }
}