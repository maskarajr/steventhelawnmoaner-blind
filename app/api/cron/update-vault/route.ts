import { NextRequest, NextResponse } from "next/server";
import { fetchLeaderboard } from '@/app/lib/neynar';
import { LeaderboardVault } from '@/app/lib/leaderboardVault';
import type { User } from '@/app/types';

const UPDATE_VAULT_SECRET = process.env.UPDATE_VAULT_SECRET;
const ADMIN_FID = process.env.NEXT_PUBLIC_ADMIN_FID || '262391';

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.split(' ')[1] === UPDATE_VAULT_SECRET) {
    return true;
  }
  const secretParam = request.nextUrl.searchParams.get('secret');
  return secretParam === UPDATE_VAULT_SECRET;
}

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

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Fetch the latest leaderboard data
    let leaderboard: User[] = [];
    try {
      leaderboard = await fetchLeaderboard();
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
      return NextResponse.json({ error: 'No leaderboard data found' }, { status: 400 });
    }
    // Map User[] to LeaderboardEntry[] for SecretVaults
    const leaderboardEntries = leaderboard.map(user => ({
      _id: String(user.fid),
      fid: { '%allot': String(user.fid) },
      username: { '%allot': user.username || '' },
      profileName: { '%allot': user.displayName || '' },
      points: user.points,
      rank: undefined,
      displayName: user.displayName,
      pfp: user.pfp,
    }));
    // Store in SecretVaults only
    await LeaderboardVault.getInstance().storeLeaderboardData(leaderboardEntries);
    return NextResponse.json({ success: true, message: 'SecretVault leaderboard updated successfully', count: leaderboardEntries.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update SecretVault leaderboard', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 