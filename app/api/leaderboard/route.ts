import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardVault } from '@/app/lib/leaderboardVault';
import { createClient } from '@farcaster/quick-auth';
import { kv } from '@vercel/kv';

export const dynamic = "force-dynamic";

const ADMIN_FID = process.env.NEXT_PUBLIC_ADMIN_FID || '262391';
const DEV_FID = process.env.NEXT_PUBLIC_DEV_FID || '192165';
const DOMAIN = process.env.NEXT_PUBLIC_MINIAPP_DOMAIN || 'localhost';
const client = createClient();

function getFieldValue(value: string | { '%allot': string } | undefined) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '%allot' in value && typeof value['%allot'] === 'string') return value['%allot'];
  return null;
}

export async function GET(req: NextRequest) {
  // Extract FID from Authorization header if present
  let fid = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      fid = payload.sub;
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  }

  const vault = LeaderboardVault.getInstance();
  const lastUpdate = await kv.get('lastUpdate');
  const lastRefresh = await kv.get('lastRefresh');
  if (String(fid) === String(ADMIN_FID) || String(fid) === String(DEV_FID)) {
    // Admin or dev: show all decrypted fields, no masking or filtering
    let leaderboard = await vault.getAllLeaderboardData();

    // Fetch pfps from Neynar proxy
    const fids = leaderboard.map(entry => getFieldValue(entry.fid)).filter(Boolean);
    try {
      const baseUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.NEXT_PUBLIC_HOST || (typeof window !== 'undefined' ? window.location.origin : ''));
      const neynarRes = await fetch(`${baseUrl}/api/neynar-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/user/bulk',
          params: { fids: fids.join(',') }
        })
      });
      const neynarData = await neynarRes.json();
      const pfpMap: Record<string, string> = {};
      if (neynarData.users) {
        for (const user of neynarData.users) {
          pfpMap[String(user.fid)] = user.pfp_url;
        }
      }
      leaderboard = leaderboard.map(entry => {
        const fidStr = getFieldValue(entry.fid) || '';
        return {
          ...entry,
          pfp: fidStr && pfpMap[fidStr] ? pfpMap[fidStr] : undefined,
        };
      });
    } catch (err) {
      console.error('Failed to fetch pfps from Neynar:', err);
    }

    return NextResponse.json({ leaderboard, message: null, lastUpdate, lastRefresh });
  } else if (fid) {
    // Regular user: show only their entry (decrypted), others are masked
    const allEntries = await vault.getAllLeaderboardData();
    const masked = allEntries.map(entry => {
      const entryFid = getFieldValue(entry.fid);
      if (String(entryFid) === String(fid)) {
        return entry; // show full details for self
      } else {
        return {
          _id: entry._id,
          fid: entry.fid,
          username: null,
          profileName: null,
          points: entry.points,
          rank: entry.rank,
          displayName: null,
          pfp: null,
        };
      }
    });
    const hasEntry = masked.some(entry => String(getFieldValue(entry.fid)) === String(fid));
    return NextResponse.json({
      leaderboard: masked,
      message: hasEntry ? null : "Ask @lawn.eth to gib you some points, So you can brag about it",
      lastUpdate,
      lastRefresh
    });
  } else {
    // Not authenticated: mask all sensitive fields
    const allEntries = await vault.getAllLeaderboardData();
    const masked = allEntries.map(entry => ({
      _id: entry._id,
      fid: entry.fid,
      username: null,
      profileName: null,
      points: entry.points,
      rank: entry.rank,
      displayName: null,
      pfp: null,
    }));
    return NextResponse.json({
      leaderboard: masked,
      message: "Ask @lawn.eth to gib you some points, so you can brag about it to your friends",
      lastUpdate,
      lastRefresh
    });
  }
} 