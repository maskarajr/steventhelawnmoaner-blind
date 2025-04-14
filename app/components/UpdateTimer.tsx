"use client";

import { useState, useEffect } from 'react';

export default function UpdateTimer() {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const nextUpdate = new Date(now);
      
      // Calculate next 15-minute interval
      const minutesToNext = 15 - (minutes % 15);
      nextUpdate.setMinutes(minutes + minutesToNext);
      nextUpdate.setSeconds(0);
      nextUpdate.setMilliseconds(0);

      const diff = nextUpdate.getTime() - now.getTime();
      
      const minutesLeft = Math.floor(diff / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      return `${minutesLeft}m ${secondsLeft}s`;
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