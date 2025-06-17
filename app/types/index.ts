export interface User {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  points: number;
}

export type EncryptedString = { '%allot': string; [key: string]: any };

export interface LeaderboardEntry {
  _id: string;
  fid: string | EncryptedString;
  username: string | EncryptedString;
  profileName: string | EncryptedString;
  points: number;
  rank?: number;
  displayName?: string;
  pfp?: string;
}

export interface PublicLeaderboardEntry {
  points: number;
}