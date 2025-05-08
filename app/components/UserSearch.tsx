"use client";

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";

interface UserSearchProps {
  onSearch: (username: string) => void;
  allUsers: string[]; // Array of all usernames from KV storage
}

export default function UserSearch({ onSearch, allUsers }: UserSearchProps) {
  const [username, setUsername] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<string[]>([]);

  useEffect(() => {
    if (username.trim()) {
      const filtered = allUsers.filter(user => 
        user.toLowerCase().includes(username.toLowerCase().trim())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [username, allUsers]);

  const handleUserSelect = (selectedUsername: string) => {
    setUsername(selectedUsername);
    onSearch(selectedUsername);
  };

  return (
    <div className="relative flex flex-col gap-2 w-full max-w-md">
      <Input
        type="text"
        placeholder="Start typing a Farcaster username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="flex-1 text-white placeholder:text-white/60 bg-[#00011f] border-[#0021f5] focus:border-[#0021f5] focus:ring-[#0021f5]"
      />
      
      {filteredUsers.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#00011f] border border-[#0021f5] rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          {filteredUsers.map((user) => (
            <div
              key={user}
              className="px-4 py-2 hover:bg-[#0021f5]/20 cursor-pointer text-white border-b border-[#0021f5]/20 last:border-b-0"
              onClick={() => handleUserSelect(user)}
            >
              @{user}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}