"use client";

import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LeaderboardEntry } from '../types';
import UpdateTimer from './UpdateTimer';

interface LeaderboardProps {
  users: LeaderboardEntry[];
}

const ITEMS_PER_PAGE = 20;

export default function Leaderboard({ users }: LeaderboardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  
  // Get current users for the page
  const indexOfLastUser = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstUser = indexOfLastUser - ITEMS_PER_PAGE;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-center text-white">Lawn Points Leaderboard</h2>
        <UpdateTimer />
      </div>
      
      <div className="w-full max-w-2xl space-y-3">
        {currentUsers.map((user) => (
          <Card key={user.fid} className="p-3 sm:p-4 flex items-center justify-between bg-[#0021f5] text-white">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex-shrink-0 w-8 text-center">
                {user.rank === 1 && <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />}
                {user.rank === 2 && <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />}
                {user.rank === 3 && <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />}
                {user.rank > 3 && <span className="text-sm sm:text-base font-medium">#{user.rank}</span>}
              </div>
              
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src={user.pfp} alt={user.username} />
                <AvatarFallback>{user.username[0]}</AvatarFallback>
              </Avatar>
              
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base font-semibold truncate">{user.displayName}</p>
                  <span className="text-xs opacity-80 hidden sm:inline">#{user.rank}</span>
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

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="bg-[#0021f5] text-[#00011f] border-[#00011f] hover:bg-[#00011f] hover:text-[#0021f5] transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-white font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="bg-[#0021f5] text-[#00011f] border-[#00011f] hover:bg-[#00011f] hover:text-[#0021f5] transition-colors disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}