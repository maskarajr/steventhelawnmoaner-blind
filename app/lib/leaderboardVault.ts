import { SecretVaultWrapper } from 'secretvaults';
import { orgConfig } from '../config/orgConfig';
import type { LeaderboardEntry, PublicLeaderboardEntry } from '../types';

// Schema ID from your SecretVault collection
const SCHEMA_ID = process.env.NILLION_SCHEMA_ID;

// Define the type for SecretVaultWrapper
type SecretVaultWrapperType = any; // Temporary type until we have proper types

export class LeaderboardVault {
  private collection: SecretVaultWrapperType;
  private initPromise: Promise<void>;
  private static instance: LeaderboardVault;

  private constructor() {
    this.collection = new SecretVaultWrapper(
      orgConfig.nodes,
      orgConfig.orgCredentials,
      SCHEMA_ID
    );
    this.initPromise = this.collection.init();
  }

  public static getInstance(): LeaderboardVault {
    if (!LeaderboardVault.instance) {
      LeaderboardVault.instance = new LeaderboardVault();
    }
    return LeaderboardVault.instance;
  }

  // Store leaderboard entries
  async storeLeaderboardData(entries: LeaderboardEntry[]): Promise<any> {
    await this.initPromise;
    const dataWritten = await this.collection.writeToNodes(entries);
    return dataWritten;
  }

  // Get all leaderboard records (array)
  async getAllLeaderboardData(): Promise<LeaderboardEntry[]> {
    await this.initPromise;
    // Following Nillion docs: https://docs.nillion.com/build/secretVault-secretDataAnalytics/retrieve
    // This will fetch all records from the collection
    const dataRead = await this.collection.readFromNodes({});
    return dataRead;
  }

  // Find a user entry by fid (decrypted)
  async getUserEntry(fid: string): Promise<LeaderboardEntry | null> {
    try {
      const data = await this.getAllLeaderboardData();
      if (!data) return null;
      return data.find(entry =>
        typeof entry.fid === 'object' && entry.fid !== null && '%allot' in entry.fid && entry.fid['%allot'] === fid
      ) || null;
    } catch (error) {
      console.error('Error getting user entry:', error);
      throw error;
    }
  }

  // Check if a user is admin by fid
  async isAdmin(fid: string): Promise<boolean> {
    try {
      const data = await this.getAllLeaderboardData();
      if (!data) return false;
      // Check if the fid matches the admin FID
      return data.some(entry =>
        typeof entry.fid === 'object' && entry.fid !== null && '%allot' in entry.fid && entry.fid['%allot'] === fid
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
      throw error;
    }
  }

  // Get public leaderboard (points only)
  async getPublicLeaderboard(): Promise<PublicLeaderboardEntry[]> {
    try {
      const data = await this.getAllLeaderboardData();
      if (!data) return [];
      return data.map(entry => ({
        points: entry.points
      }));
    } catch (error) {
      console.error('Error getting public leaderboard:', error);
      throw error;
    }
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    // Return real data from SecretVaults
    return this.getAllLeaderboardData();
  }
}

export const leaderboardVault = LeaderboardVault.getInstance(); 