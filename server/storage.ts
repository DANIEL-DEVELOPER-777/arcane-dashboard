import { db } from "./db";
import {
  accounts,
  equitySnapshots,
  type Account,
  type InsertAccount,
  type EquitySnapshot,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Accounts
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccountByToken(token: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, updates: Partial<InsertAccount>): Promise<Account>;
  updateAccountStats(id: number, balance: number, equity: number, profit: number): Promise<Account>;
  deleteAccount(id: number): Promise<void>;

  // History
  addEquitySnapshot(snapshot: typeof equitySnapshots.$inferInsert): Promise<EquitySnapshot>;
  getAccountHistory(accountId: number, limit?: number): Promise<EquitySnapshot[]>;
  getPortfolioHistory(limit?: number): Promise<{ timestamp: Date, equity: number, balance: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts).orderBy(desc(accounts.lastUpdated));
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async getAccountByToken(token: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.token, token));
    return account;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const token = randomUUID();
    const [account] = await db
      .insert(accounts)
      .values({ ...insertAccount, token })
      .returning();
    return account;
  }

  async updateAccount(id: number, updates: Partial<InsertAccount>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set(updates)
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  async updateAccountStats(id: number, balance: number, equity: number, profit: number): Promise<Account> {
    const profitPercent = balance > 0 ? (profit / balance) * 100 : 0;
    const [account] = await db
      .update(accounts)
      .set({
        balance,
        equity,
        profit,
        profitPercent,
        lastUpdated: new Date(),
      })
      .where(eq(accounts.id, id))
      .returning();
    
    // Record snapshot
    await this.addEquitySnapshot({
      accountId: id,
      balance,
      equity,
    });

    return account;
  }

  async deleteAccount(id: number): Promise<void> {
    await db.delete(equitySnapshots).where(eq(equitySnapshots.accountId, id));
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  async addEquitySnapshot(snapshot: typeof equitySnapshots.$inferInsert): Promise<EquitySnapshot> {
    const [entry] = await db.insert(equitySnapshots).values(snapshot).returning();
    return entry;
  }

  async getAccountHistory(accountId: number, limit = 100): Promise<EquitySnapshot[]> {
    return await db
      .select()
      .from(equitySnapshots)
      .where(eq(equitySnapshots.accountId, accountId))
      .orderBy(desc(equitySnapshots.timestamp))
      .limit(limit);
  }

  async getPortfolioHistory(limit = 100): Promise<{ timestamp: Date, equity: number, balance: number }[]> {
    // This is a simplified aggregation. For a real app, you'd want to bucket by time.
    // For now, we'll just sum everything (which might be heavy) or just return latest snapshots.
    // A better approach for MVP: Group by hour/day.
    
    // For MVP, let's just fetch all snapshots and aggregate in memory or use a simple query
    // SQL aggregation by hour
    const result = await db.execute(sql`
      SELECT 
        date_trunc('hour', timestamp) as ts,
        SUM(equity) as equity,
        SUM(balance) as balance
      FROM equity_snapshots
      GROUP BY ts
      ORDER BY ts DESC
      LIMIT ${limit}
    `);
    
    return result.rows.map((row: any) => ({
      timestamp: new Date(row.ts),
      equity: Number(row.equity),
      balance: Number(row.balance),
    }));
  }
}

export const storage = new DatabaseStorage();
