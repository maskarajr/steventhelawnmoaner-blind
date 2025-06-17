"use client";

import { useState, useEffect } from 'react';
import { REFRESH_INTERVAL } from '@/app/lib/constants';

interface UpdateTimerProps {
  lastRefresh: string | null;
}

export function UpdateTimer({ lastRefresh }: UpdateTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');

  //console.log('lastUpdate passed to UpdateTimer:', lastRefresh);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!lastRefresh) return '';

      const now = new Date();
      const lastUpdateTime = new Date(lastRefresh);
      const nextUpdate = new Date(lastUpdateTime.getTime() + REFRESH_INTERVAL);
      
      const diff = nextUpdate.getTime() - now.getTime();
      //console.log('now:', now, 'lastUpdateTime:', lastUpdateTime, 'nextUpdate:', nextUpdate, 'diff:', diff, 'REFRESH_INTERVAL:', REFRESH_INTERVAL);
      if (diff <= 0) return '0m 0s';

      const minutesLeft = Math.floor((diff / 1000 / 60) % 60);
      const secondsLeft = Math.floor((diff / 1000) % 60);

      return `${minutesLeft}m ${secondsLeft.toString().padStart(2, '0')}s`;
    };

    // Update immediately and then every second
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [lastRefresh]); // Add lastRefresh as a dependency

  if (!lastRefresh) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      <span>Updates in {timeLeft}</span>
    </div>
  );
} 