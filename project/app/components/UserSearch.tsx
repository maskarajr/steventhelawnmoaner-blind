"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface UserSearchProps {
  onSearch: (username: string) => void;
}

export default function UserSearch({ onSearch }: UserSearchProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSearch(username.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
      <Input
        type="text"
        placeholder="Enter Farcaster username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="flex-1 text-[#00011f] placeholder:text-[#00011f]/60"
      />
      <Button type="submit" variant="secondary" className="text-[#00011f]">
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  );
}