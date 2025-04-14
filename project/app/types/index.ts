export interface User {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  points: number;
}

export interface LeaderboardEntry extends User {
  rank: number;
}