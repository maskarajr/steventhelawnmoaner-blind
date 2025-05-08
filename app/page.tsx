"use client";

import { useState, useEffect } from 'react';
import UserSearch from './components/UserSearch';
import Leaderboard from './components/Leaderboard';
import { Card } from "@/components/ui/card";
import { fetchLeaderboard, fetchUserPointsFromBlob } from './lib/neynar';
import type { User, LeaderboardEntry } from './types';
import { toast } from "sonner";
import Image from 'next/image';
import stevenTheLawn from './assets/steventhelawn.jpeg';
import { sdk } from '@farcaster/frame-sdk';

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Load leaderboard first
        await loadLeaderboard();
        
        // Then initialize Farcaster SDK
        await sdk.actions.ready({ disableNativeGestures: true });
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    initialize();
  }, []);

  // Clear search result after timeout
  useEffect(() => {
    let fadeTimer: NodeJS.Timeout;
    let clearTimer: NodeJS.Timeout;

    if (searchResult) {
      // Start fade out after 27 seconds (giving 3 seconds for the fade animation)
      fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 27000);

      // Clear the search result after 30 seconds
      clearTimer = setTimeout(() => {
        setSearchResult(null);
        setFadeOut(false);
      }, 30000);
    }

    // Cleanup timers
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [searchResult]);

  async function loadLeaderboard() {
    try {
      setLoading(true);
      setError(null);
      const users = await fetchLeaderboard();
      setLeaderboard(
        users.map((user, index) => ({
          ...user,
          rank: index + 1
        }))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load leaderboard';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = async (username: string) => {
    setFadeOut(false);
    try {
      setError(null);
      
      // First check if user exists in current leaderboard state
      const leaderboardUser = leaderboard.find(
        user => user.username.toLowerCase() === username.toLowerCase()
      );

      if (leaderboardUser) {
        setSearchResult({
          username: leaderboardUser.username,
          points: leaderboardUser.points,
          fid: leaderboardUser.fid,
          displayName: leaderboardUser.displayName,
          pfp: leaderboardUser.pfp
        });
        return;
      }

      // If not in current state, check blob storage
      const points = await fetchUserPointsFromBlob(username);
      setSearchResult({
        username,
        points,
        fid: 0,
        displayName: username,
        pfp: `https://api.dicebear.com/7.x/avatars/svg?seed=${username}`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to search user';
      setError(message);
      toast.error(message);
    }
  };

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

          <div className="flex justify-center">
            <UserSearch 
              onSearch={handleSearch} 
              allUsers={leaderboard.map(user => user.username)} 
            />
          </div>

          {error && (
            <Card className="p-4 bg-red-900/20 border-red-800 text-white">
              <p className="text-red-400">{error}</p>
            </Card>
          )}

          {searchResult && !error && (
            <Card className={`p-6 bg-[#0021f5] text-white transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
              <h3 className="text-xl font-semibold mb-2">Search Result</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">@{searchResult.username}</p>
                  <p className="text-sm opacity-80">Farcaster User</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {Number(Number(searchResult.points).toFixed(4)).toString()}
                  </p>
                  <p className="text-sm opacity-80">Lawn Points</p>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="text-center text-white">Loading leaderboard...</div>
          ) : (
            <Leaderboard users={leaderboard} />
          )}
        </div>
      </div>
    </div>
  );
}