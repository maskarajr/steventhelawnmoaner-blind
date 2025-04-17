"use client";

import { useState, useEffect } from 'react';
import { REFRESH_INTERVAL } from '@/app/lib/constants';

export function UpdateTimer() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const lastUpdate = new Date(now.getTime() - (now.getTime() % REFRESH_INTERVAL));
      const nextUpdate = new Date(lastUpdate.getTime() + REFRESH_INTERVAL);
      
      const diff = nextUpdate.getTime() - now.getTime();
      const minutesLeft = Math.floor((diff / 1000 / 60) % 60);
      const secondsLeft = Math.floor((diff / 1000) % 60);

      return `${minutesLeft}m ${secondsLeft}s`;
    };

    // Update immediately and then every second
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      <span>Updates in {timeLeft}</span>
    </div>
  );
} 