import axios from 'axios';
import type { User } from '../types';

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';
const ADMIN_FID = process.env.NEXT_PUBLIC_ADMIN_FID || '262391';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

if (!NEYNAR_API_KEY) {
  console.error('NEYNAR_API_KEY is not set in environment variables');
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

async function fetchUserReplies(fid: number): Promise<any[]> {
  const cacheKey = `replies-${fid}`;
  const cached = repliesCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await api.get('/feed/user/casts', {
      params: {
        fid: fid,
        limit: 50,
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
  const cacheKey = 'leaderboard';
  const cached = leaderboardCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Get all replies by lawn.eth that contain point assignments
    const replies = await fetchUserReplies(parseInt(ADMIN_FID));
    
    // Map to store user points
    const userPoints = new Map<number, { points: number, user: any }>();
    
    // Process each reply for point assignments
    for (const reply of replies) {
      // Skip if parent_author is missing or has no FID
      if (!reply.parent_author?.fid) continue;
      
      if (reply.text.match(/[+-]\d+\s*lawn\s*points?/i)) {
        const fid = reply.parent_author.fid;
        const pointMatch = reply.text.match(/([+-]\d+)\s*lawn\s*points?/i);
        
        if (pointMatch) {
          const points = parseInt(pointMatch[1]);
          const currentPoints = userPoints.get(fid)?.points || 0;
          
          try {
            // Get user details if we haven't stored them yet
            if (!userPoints.has(fid)) {
              const userResponse = await api.get('/user/bulk', {
                params: {
                  fids: fid
                }
              });
              
              const userData = userResponse.data.users[0];
              if (userData) {
                userPoints.set(fid, {
                  points: currentPoints + points,
                  user: userData
                });
              }
            } else {
              userPoints.set(fid, {
                points: currentPoints + points,
                user: userPoints.get(fid)!.user
              });
            }
          } catch (error) {
            console.error(`Error fetching user details for FID ${fid}:`, error);
            continue;
          }
        }
      }
    }
    
    // Convert to array and format for return
    const leaderboard = Array.from(userPoints.entries())
      .filter(([_, data]) => data.user) // Filter out any entries with missing user data
      .map(([_, data]) => ({
        fid: data.user.fid,
        username: data.user.username,
        displayName: data.user.display_name,
        pfp: data.user.pfp_url,
        points: data.points
      }));
    
    // Sort by points in descending order
    const sortedLeaderboard = leaderboard.sort((a, b) => b.points - a.points);
    leaderboardCache.set(cacheKey, sortedLeaderboard);
    return sortedLeaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}