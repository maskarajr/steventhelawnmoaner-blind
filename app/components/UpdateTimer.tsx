"use client";

import { useState, useEffect } from 'react';

export default function UpdateTimer() {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextUpdate = new Date(now);
      
      // Set to next midnight UTC
      nextUpdate.setUTCHours(24, 0, 0, 0);

      const diff = nextUpdate.getTime() - now.getTime();
      
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
    };

    // Update immediately
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-sm text-gray-400 flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span>Next update in: {timeLeft}</span>
    </div>
  );
} 