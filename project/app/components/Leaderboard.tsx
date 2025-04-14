"use client";

import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  users: LeaderboardEntry[];
}

export default function Leaderboard({ users }: LeaderboardProps) {
  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold text-center mb-6 text-white">Lawn Points Leaderboard</h2>
      
      <div className="w-full max-w-2xl space-y-3">
        {users.map((user, index) => (
          <Card key={user.fid} className="p-3 sm:p-4 flex items-center justify-between bg-[#0021f5] text-white">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex-shrink-0 w-8 text-center">
                {index === 0 && <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />}
                {index === 1 && <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />}
                {index === 2 && <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />}
                {index > 2 && <span className="text-sm sm:text-base font-medium">#{index + 1}</span>}
              </div>
              
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src={user.pfp} alt={user.username} />
                <AvatarFallback>{user.username[0]}</AvatarFallback>
              </Avatar>
              
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base font-semibold truncate">{user.displayName}</p>
                  <span className="text-xs opacity-80 hidden sm:inline">#{index + 1}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-80 truncate">@{user.username}</p>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <p className="text-base sm:text-lg font-bold">{user.points}</p>
              <p className="text-[10px] sm:text-xs opacity-80">Lawn Points</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}