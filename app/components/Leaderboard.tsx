"use client";

import { Trophy } from "lucide-react";
import Image from "next/image";
import type { LeaderboardEntry } from '../types';

function getFieldValue(value: string | { '%allot': string } | undefined) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '%allot' in value && typeof value['%allot'] === 'string') return value['%allot'];
  return null;
}

function blurIfMissing(value: string | undefined) {
  return value
    ? <span>{value}</span>
    : <span style={{ filter: "blur(4px)", color: "#aaa" }}>Hidden</span>;
}

const trophyColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function Leaderboard({ users, isAdmin = false, signedInFid }: { users: LeaderboardEntry[], isAdmin: boolean, signedInFid?: string }) {
  // users should already be sorted and ranked by the parent
  return (
    <div className="flex flex-col items-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>

      <div className="w-full max-w-[600px] min-w-[325px] mx-auto">
        <div className="space-y-2">
          {users.map((entry, idx) => {
            const entryFid = getFieldValue(entry.fid);
            const username = getFieldValue(entry.username) || '';
            const profileName = getFieldValue(entry.profileName) || '';
            // Blur logic
            let showBlur = false;
            if (!isAdmin) {
              if (!signedInFid) {
                showBlur = true; // Not signed in, blur all
              } else if (signedInFid !== entryFid) {
                showBlur = true; // Signed in, blur all except self
              }
            }
            return (
              <div key={String(entryFid)} className="rounded-lg border shadow-sm p-3 sm:p-4 flex items-center justify-between bg-[#0021f5] text-white">
                {/* Rank number always on the left, except for top 3 (trophy holders) */}
                <div className="flex-shrink-0 w-8 text-center">
                  {idx < 3 ? (
                    <span className="text-2xl">{idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}</span>
                  ) : (
                    <span className="text-sm font-bold text-white">#{entry.rank || idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  {/* Show pfp if present */}
                  {entry.pfp && (
                    <img src={entry.pfp} alt="pfp" className="w-8 h-8 rounded-full" />
                  )}
                  <div className="min-w-0 ml-2">
                    {isAdmin ? (
                      <>
                        <div className="flex items-center ">
                          <p className="text-sm sm:text-base font-semibold truncate">{profileName}</p>
                        </div>
                        <p className="text-xs sm:text-sm opacity-80 truncate">@{username}</p>
                      </>
                    ) : !signedInFid ? (
                      // Not signed in: blur everything, no usernames
                      <span style={{ filter: "blur(4px)", color: "#aaa" }}>████████████████████</span>
                    ) : showBlur ? (
                      // Signed in: blur all except self
                      <span style={{ filter: "blur(4px)", color: "#aaa" }}>@username</span>
                    ) : (
                      // Signed in: show self
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-sm sm:text-base font-semibold truncate">{profileName}</p>
                        </div>
                        <p className="text-xs sm:text-sm opacity-80 truncate">@{username}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-base font-bold">{Number(entry.points)}</p>
                  <p className="text-[10px] opacity-80">Lawn Points</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}