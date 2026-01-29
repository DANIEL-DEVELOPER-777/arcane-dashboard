import { db } from "./db";
import {
  accounts,
  equitySnapshots,
  trades,
  type Account,
  type InsertAccount,
  type EquitySnapshot,
  type Trade,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Accounts
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccountByToken(token: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, updates: Partial<InsertAccount>): Promise<Account>;
  updateAccountStats(id: number, balance: number, equity: number, profit: number, dailyProfit?: number): Promise<Account>;
  deleteAccount(id: number): Promise<void>;

  // History
  addEquitySnapshot(snapshot: typeof equitySnapshots.$inferInsert): Promise<EquitySnapshot>;
  getAccountHistory(accountId: number, limit?: number): Promise<EquitySnapshot[]>;
  getAccountSnapshotBeforeOrAt(accountId: number, at: Date): Promise<EquitySnapshot | null>;
  getAccountSnapshotAfterOrAt(accountId: number, at: Date): Promise<EquitySnapshot | null>;
  getAccountHistoryInRange(accountId: number, start: Date, end: Date): Promise<EquitySnapshot[]>;
  getAccountProfitInRange(accountId: number, start: Date, end: Date): Promise<number>;

  // Trades (MT5 history)
  addTrades(trades: { accountId: number; profit: number; timestamp: Date }[]): Promise<void>;
  getTotalProfitFromTrades(accountId: number): Promise<number>;
  getTradesByAccount(accountId: number): Promise<{ id: number; accountId: number; profit: number; timestamp: Date }[]>;

  getPortfolioHistory(limit?: number): Promise<{ timestamp: Date, equity: number, balance: number }[]>;
  getPortfolioHistoryInRange(start: Date, end: Date, period?: string): Promise<{ timestamp: Date, equity: number, balance: number }[]>;
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

  async updateAccountStats(id: number, balance: number, equity: number, profit: number, dailyProfit?: number): Promise<Account> {
    // Calculate starting balance for total profit (balance before all profit was made)
    const startingBalance = balance - profit;
    const profitPercent = startingBalance > 0 ? (profit / startingBalance) * 100 : 0;
    
    // Calculate daily profit percent based on daily starting balance
    const dailyProfitValue = dailyProfit ?? 0;
    const dailyStartingBalance = balance - dailyProfitValue;
    const dailyProfitPercentCalc = dailyStartingBalance > 0 ? (dailyProfitValue / dailyStartingBalance) * 100 : 0;
    
    const [account] = await db
      .update(accounts)
      .set({
        balance,
        equity,
        profit,
        profitPercent,
        dailyProfit: dailyProfitValue,
        dailyProfitPercent: dailyProfitPercentCalc,
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

  async getAccountSnapshotBeforeOrAt(accountId: number, at: Date): Promise<EquitySnapshot | null> {
    const result = await db.execute(sql`
      SELECT * FROM equity_snapshots WHERE account_id = ${accountId} AND timestamp <= ${at} ORDER BY timestamp DESC LIMIT 1
    `);
    return result.rows[0] ?? null;
  }

  async getAccountSnapshotAfterOrAt(accountId: number, at: Date): Promise<EquitySnapshot | null> {
    const result = await db.execute(sql`
      SELECT * FROM equity_snapshots WHERE account_id = ${accountId} AND timestamp >= ${at} ORDER BY timestamp ASC LIMIT 1
    `);
    return result.rows[0] ?? null;
  }

  async getAccountHistoryInRange(accountId: number, start: Date, end: Date): Promise<EquitySnapshot[]> {
    const result = await db.execute(sql`
      SELECT * FROM equity_snapshots WHERE account_id = ${accountId} AND timestamp BETWEEN ${start} AND ${end} ORDER BY timestamp ASC
    `);
    return result.rows.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
  }

  async getAccountProfitInRange(accountId: number, start: Date, end: Date): Promise<number> {
    const startSnap = await this.getAccountSnapshotBeforeOrAt(accountId, start) ?? await this.getAccountSnapshotAfterOrAt(accountId, start);
    const endSnap = await this.getAccountSnapshotBeforeOrAt(accountId, end);
    if (!startSnap || !endSnap) return 0;
    return Number(endSnap.balance) - Number(startSnap.balance);
  }

  // Insert trades (history). We guard against exact duplicates (same account, timestamp, profit).
  async addTrades(tradesList: { accountId: number; profit: number; timestamp: Date }[]): Promise<void> {
    for (const t of tradesList) {
      await db.execute(sql`
        INSERT INTO trades (account_id, profit, timestamp)
        SELECT ${t.accountId}, ${t.profit}, ${t.timestamp}
        WHERE NOT EXISTS (
          SELECT 1 FROM trades WHERE account_id = ${t.accountId} AND timestamp = ${t.timestamp} AND profit = ${t.profit}
        )
      `);
    }
  }

  async getTotalProfitFromTrades(accountId: number): Promise<number> {
    const result = await db.execute(sql`SELECT COALESCE(SUM(profit),0) as total FROM trades WHERE account_id = ${accountId}`);
    return Number(result.rows[0]?.total ?? 0);
  }

  async getTradesByAccount(accountId: number): Promise<{ id: number; accountId: number; profit: number; timestamp: Date }[]> {
    const result = await db.execute(sql`SELECT * FROM trades WHERE account_id = ${accountId} ORDER BY timestamp ASC`);
    return result.rows.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
  }

  async getPortfolioHistoryInRange(start: Date, end: Date, period: string = "ALL"): Promise<{ timestamp: Date, equity: number, balance: number }[]> {
    // choose bucket unit
    const unit = period === "1D" ? 'hour' : period === '1W' || period === '1M' ? 'day' : period === '1Y' ? 'month' : 'month';
    const result = await db.execute(sql`
      SELECT date_trunc(${unit}, timestamp) as ts, SUM(equity) as equity, SUM(balance) as balance
      FROM equity_snapshots WHERE timestamp BETWEEN ${start} AND ${end}
      GROUP BY ts ORDER BY ts ASC
    `);
    return result.rows.map((row: any) => ({ timestamp: new Date(row.ts), equity: Number(row.equity), balance: Number(row.balance) }));
  }
}

export const storage = new DatabaseStorage();
