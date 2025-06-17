"use client";

import { useState, useEffect } from 'react';
import Leaderboard from './components/Leaderboard';
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import Image from 'next/image';
import stevenTheLawn from './assets/steventhelawn.jpeg';
import { sdk } from '@farcaster/frame-sdk';
import type { LeaderboardEntry } from './types';
import { useAuth } from './lib/auth';
import { UpdateTimer } from '@/app/components/UpdateTimer';

// Helper to fetch leaderboard from SecretVaults API
const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Invalid leaderboard data format received');
  return data;
};

// Get admin and dev FIDs from env (client-side safe)
const ADMIN_FID = String(process.env.NEXT_PUBLIC_ADMIN_FID || '262391');
const DEV_FID = String(process.env.NEXT_PUBLIC_DEV_FID || '192165');

// Helper to get field value from string or { '%allot': string }
function getFieldValue(value: string | { '%allot': string } | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '%allot' in value && typeof value['%allot'] === 'string') return value['%allot'];
  return null;
}

export default function Home() {
  const { token, fid, signIn } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!fid || !token) {
          await signIn();
        }
        await loadLeaderboard();
        await sdk.actions.ready({ disableNativeGestures: true });
      } catch (error) {
        console.error('Failed to initialize:', error);
        // If sign-in is rejected, still load the leaderboard (blurred)
        await loadLeaderboard();
      }
    };
    initialize();
  }, [signIn, fid, token]);

  async function loadLeaderboard() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/leaderboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const { leaderboard: data, message, lastUpdate, lastRefresh } = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid leaderboard data format received');
      // Sort and rank
      const sorted = [...data].sort((a, b) => Number(b.points) - Number(a.points));
      setLeaderboard(sorted.map((user, idx) => ({ ...user, rank: idx + 1 })));
      setApiMessage(message || null);
      setLastUpdate(lastUpdate || null);
      setLastRefresh(lastRefresh || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load leaderboard';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // Find the signed-in user's leaderboard entry
  const userEntry = fid
    ? leaderboard.find(entry => String(getFieldValue(entry.fid)) === String(fid))
    : null;

  // Determine admin status
  const isAdmin = String(fid) === ADMIN_FID || String(fid) === DEV_FID;

  return (
    <div className="min-h-screen bg-[#00011f]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-white font-bungee-spice">
              Lawnboard
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className="relative w-[30px] h-[30px]">
                <Image
                  src={stevenTheLawn}
                  alt="Steven the Lawn"
                  fill
                  sizes="30px"
                  className="rounded-full object-cover"
                  priority
                />
              </div>
              <p className="text-lg text-white font-bungee-spice">
                Steven is watching y&apos;all
              </p>
            </div>
          </div>

          <div className="flex justify-center my-2">
            <button
              onClick={loadLeaderboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold mb-4"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh Leaderboard'}
            </button>
          </div>
          {!fid && (
            <div className="text-center text-sm text-yellow-400 mb-4">
              Not signed in. FID not detected.
            </div>
          )}
          {userEntry && (
            <div className="w-full max-w-2xl mx-auto mb-4">
              <Card className="p-6 bg-[#0021f5] text-white">
                <div className="flex items-center gap-4">
                  {userEntry.pfp && (
                    <img src={userEntry.pfp} alt="pfp" className="w-12 h-12 rounded-full" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-white truncate">@{getFieldValue(userEntry.username)}</span>
                    {getFieldValue(userEntry.profileName) && (
                      <span className="text-gray-300 truncate">{getFieldValue(userEntry.profileName)}</span>
                    )}
                    <div className="text-xs text-gray-400">FID: {fid}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xl font-bold">
                      {Number(Number(userEntry.points).toFixed(4)).toString()}
                    </div>
                    <div className="text-xs opacity-80">Lawn Points</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {error && (
            <Card className="p-4 bg-red-900/20 border-red-800 text-white">
              <p className="text-red-400">{error}</p>
            </Card>
          )}

          {/* Only show the alert if not signed in */}
          {!fid && apiMessage && (
            <div className="text-center mb-2">
              <div className="font-bold text-red-500 text-lg animate-pulse mb-1">🚨 Oops Intruder Alert 🚨</div>
              <div className="text-yellow-400 font-semibold">{apiMessage}</div>
            </div>
          )}

          {loading ? (
            <div className="text-center text-white">Loading leaderboard...</div>
          ) : (
            <Leaderboard users={leaderboard} isAdmin={isAdmin} signedInFid={fid ? String(fid) : undefined} />
          )}
        </div>
      </div>
    </div>
  );
}