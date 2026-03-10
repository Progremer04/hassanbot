import fs from 'fs';
import path from 'path';

// ----- Type Definitions -----
interface User {
  id: string;
  username?: string;
  firstName?: string;
  banned: boolean;
  lastSeen?: Date;
}

interface Code {
  code: string;           // uppercase
  email: string;
  password: string;
  label?: string;
  isUsed: boolean;
  usedBy?: string;        // userId
  usedByUsername?: string;
  usedAt?: Date;
  createdAt?: Date;
}

interface Redemption {
  code: string;
  userId: string;
  username: string;
  firstName: string;
  email: string;
  password: string;
  label: string;
  redeemedAt: Date;
}

interface Admin {
  userId: string;
  role?: string;          // e.g., "owner", "admin"
  addedAt: Date;
}

interface StorageData {
  admins: Admin[];
  users: Record<string, User>;      // key = userId
  codes: Record<string, Code>;       // key = code (uppercase)
  redemptions: Redemption[];
}

// ----- Storage Class -----
class Storage {
  private data: StorageData;
  private dataPath: string;

  constructor(dataPath: string = path.join(__dirname, 'data.json')) {
    this.dataPath = dataPath;
    try {
      const fileData = fs.readFileSync(this.dataPath, 'utf-8');
      this.data = JSON.parse(fileData);
      // Convert date strings back to Date objects if needed
      this.data.admins.forEach(a => a.addedAt = new Date(a.addedAt));
      Object.values(this.data.users).forEach(u => {
        if (u.lastSeen) u.lastSeen = new Date(u.lastSeen);
      });
      Object.values(this.data.codes).forEach(c => {
        if (c.createdAt) c.createdAt = new Date(c.createdAt);
        if (c.usedAt) c.usedAt = new Date(c.usedAt);
      });
      this.data.redemptions.forEach(r => r.redeemedAt = new Date(r.redeemedAt));
    } catch {
      // File doesn't exist or is invalid – start fresh
      this.data = {
        admins: [],
        users: {},
        codes: {},
        redemptions: []
      };
      this.saveSync();
    }
  }

  private saveSync(): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
  }

  // ----- Admin methods -----
  async addAdmin(userId: string, role: string = 'admin'): Promise<void> {
    if (!this.data.admins.some(a => a.userId === userId)) {
      this.data.admins.push({ userId, role, addedAt: new Date() });
      this.saveSync();
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.data.admins.some(a => a.userId === userId);
  }

  async removeAdmin(userId: string): Promise<void> {
    this.data.admins = this.data.admins.filter(a => a.userId !== userId);
    this.saveSync();
  }

  async getAdmins(): Promise<Admin[]> {
    return this.data.admins;
  }

  // ----- User methods -----
  async upsertUser(userId: string, username?: string, firstName?: string): Promise<void> {
    const user = this.data.users[userId];
    if (user) {
      user.username = username || user.username;
      user.firstName = firstName || user.firstName;
      user.lastSeen = new Date();
    } else {
      this.data.users[userId] = {
        id: userId,
        username,
        firstName,
        banned: false,
        lastSeen: new Date()
      };
    }
    this.saveSync();
  }

  async isUserBanned(userId: string): Promise<boolean> {
    const user = this.data.users[userId];
    return user ? user.banned : false;
  }

  async banUser(userId: string): Promise<void> {
    if (this.data.users[userId]) {
      this.data.users[userId].banned = true;
      this.saveSync();
    }
  }

  async unbanUser(userId: string): Promise<void> {
    if (this.data.users[userId]) {
      this.data.users[userId].banned = false;
      this.saveSync();
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Object.values(this.data.users);
  }

  // ----- Code methods -----
  async getCodeByValue(codeValue: string): Promise<Code | undefined> {
    return this.data.codes[codeValue];
  }

  async markCodeUsed(codeValue: string, userId: string, username: string): Promise<void> {
    const code = this.data.codes[codeValue];
    if (code && !code.isUsed) {
      code.isUsed = true;
      code.usedBy = userId;
      code.usedByUsername = username;
      code.usedAt = new Date();
      this.saveSync();
    }
  }

  async addCode(code: string, email: string, password: string, label?: string): Promise<void> {
    this.data.codes[code] = {
      code,
      email,
      password,
      label,
      isUsed: false,
      createdAt: new Date()
    };
    this.saveSync();
  }

  async getAllCodes(): Promise<Code[]> {
    return Object.values(this.data.codes);
  }

  // ----- Redemption methods -----
  async createRedemption(redemptionData: Omit<Redemption, 'redeemedAt'>): Promise<void> {
    const redemption: Redemption = {
      ...redemptionData,
      redeemedAt: new Date()
    };
    this.data.redemptions.push(redemption);
    this.saveSync();
  }

  async getRedemptions(): Promise<Redemption[]> {
    return this.data.redemptions;
  }

  // ----- Statistics -----
  async getStatistics(): Promise<{ totalUsers: number; totalCodes: number; usedCodes: number; totalRedemptions: number }> {
    const totalUsers = Object.keys(this.data.users).length;
    const totalCodes = Object.keys(this.data.codes).length;
    const usedCodes = Object.values(this.data.codes).filter(c => c.isUsed).length;
    const totalRedemptions = this.data.redemptions.length;
    return { totalUsers, totalCodes, usedCodes, totalRedemptions };
  }
}

// ----- Export a singleton instance -----
export const storage = new Storage();
