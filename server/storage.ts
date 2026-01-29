import { db } from "./db";
import {
  accounts,
  equitySnapshots,
  trades,
  type Account,
  type InsertAccount,
  type EquitySnapshot,
} from "@shared/schema";

// Local type alias for trade row
export type Trade = typeof trades.$inferSelect;
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
    const rows = await db.select().from(accounts).orderBy(desc(accounts.lastUpdated));
    // Compute balance/profit from trades for each account to ensure UI reflects trade-backed totals
    const result: Account[] = [];
    for (const r of rows) {
      const tradeTotal = await this.getTotalProfitFromTrades(r.id);
      result.push({ ...r, balance: tradeTotal, profit: tradeTotal });
    }
    return result;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!account) return undefined;
    const tradeTotal = await this.getTotalProfitFromTrades(account.id);
    return { ...account, balance: tradeTotal, profit: tradeTotal };
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
    // Recompute totals from trades: balance and profit are derived from trade history
    const tradeTotal = await this.getTotalProfitFromTrades(id);

    // Use tradeTotal as canonical balance/profit
    const canonicalBalance = tradeTotal;
    const canonicalProfit = tradeTotal;

    // Calculate starting balance for total profit (balance before all profit was made)
    const startingBalance = canonicalBalance - canonicalProfit;
    const profitPercent = startingBalance > 0 ? (canonicalProfit / startingBalance) * 100 : 0;

    // Calculate daily profit percent based on trades for today if not explicitly provided
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const dailyProfitValue = dailyProfit ?? (await this.getAccountProfitInRange(id, startOfDay, endOfDay));
    const dailyStartingBalance = canonicalBalance - dailyProfitValue;
    const dailyProfitPercentCalc = dailyStartingBalance > 0 ? (dailyProfitValue / dailyStartingBalance) * 100 : 0;

    const [account] = await db
      .update(accounts)
      .set({
        balance: canonicalBalance,
        equity,
        profit: canonicalProfit,
        profitPercent,
        dailyProfit: dailyProfitValue,
        dailyProfitPercent: dailyProfitPercentCalc,
        lastUpdated: new Date(),
      })
      .where(eq(accounts.id, id))
      .returning();

    // Record snapshot (use canonicalBalance/equity)
    await this.addEquitySnapshot({
      accountId: id,
      balance: canonicalBalance,
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
    const row = result.rows[0] as any;
    if (!row) return null;
    return {
      id: Number(row.id),
      accountId: Number(row.account_id),
      balance: Number(row.balance),
      equity: Number(row.equity),
      timestamp: new Date(row.timestamp),
    };
  }

  async getAccountSnapshotAfterOrAt(accountId: number, at: Date): Promise<EquitySnapshot | null> {
    const result = await db.execute(sql`
      SELECT * FROM equity_snapshots WHERE account_id = ${accountId} AND timestamp >= ${at} ORDER BY timestamp ASC LIMIT 1
    `);
    const row = result.rows[0] as any;
    if (!row) return null;
    return {
      id: Number(row.id),
      accountId: Number(row.account_id),
      balance: Number(row.balance),
      equity: Number(row.equity),
      timestamp: new Date(row.timestamp),
    };
  }

  async getAccountHistoryInRange(accountId: number, start: Date, end: Date): Promise<EquitySnapshot[]> {
    const result = await db.execute(sql`
      SELECT * FROM equity_snapshots WHERE account_id = ${accountId} AND timestamp BETWEEN ${start} AND ${end} ORDER BY timestamp ASC
    `);
    return result.rows.map((r: any) => ({
      id: Number(r.id),
      accountId: Number(r.account_id),
      balance: Number(r.balance),
      equity: Number(r.equity),
      timestamp: new Date(r.timestamp),
    }));
  }

  // First try to compute profit from trades in the range. If no trades exist, fall back to snapshot diff.
  async getAccountProfitInRange(accountId: number, start: Date, end: Date): Promise<number> {
    const tradesRes = await db.execute(sql`
      SELECT COALESCE(SUM(profit), 0) as total FROM trades WHERE account_id = ${accountId} AND timestamp BETWEEN ${start} AND ${end}
    `);
    const tradedTotal = Number(tradesRes.rows[0]?.total ?? 0);
    if (tradedTotal !== 0) return tradedTotal;

    // Fallback to snapshots if no trades
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

  async getTradesByAccount(accountId: number): Promise<Trade[]> {
    const result = await db.execute(sql`SELECT * FROM trades WHERE account_id = ${accountId} ORDER BY timestamp ASC`);
    return result.rows.map((r: any) => ({
      id: Number(r.id),
      accountId: Number(r.account_id),
      profit: Number(r.profit),
      timestamp: new Date(r.timestamp),
    }));
  }

  async getTradesInRange(accountId: number, start: Date, end: Date): Promise<Trade[]> {
    const result = await db.execute(sql`SELECT * FROM trades WHERE account_id = ${accountId} AND timestamp BETWEEN ${start} AND ${end} ORDER BY timestamp ASC`);
    return result.rows.map((r: any) => ({
      id: Number(r.id),
      accountId: Number(r.account_id),
      profit: Number(r.profit),
      timestamp: new Date(r.timestamp),
    }));
  }

  // Aggregate trades across all accounts into time buckets. Used as a fallback when no snapshot buckets exist.
  async getTradesAggregatedInRange(start: Date, end: Date, unit: 'hour' | 'day' | 'month') {
    const result = await db.execute(sql`
      SELECT date_trunc(${unit}, timestamp) as ts, COALESCE(SUM(profit),0) as total
      FROM trades WHERE timestamp BETWEEN ${start} AND ${end}
      GROUP BY ts ORDER BY ts ASC
    `);
    return result.rows.map((r: any) => ({ timestamp: new Date(r.ts), profit: Number(r.total) }));
  }

  async getTradeSumBefore(accountId: number, at: Date): Promise<number> {
    const res = await db.execute(sql`SELECT COALESCE(SUM(profit),0) as total FROM trades WHERE account_id = ${accountId} AND timestamp < ${at}`);
    return Number(res.rows[0]?.total ?? 0);
  }

  async getPortfolioHistory(limit = 100): Promise<{ timestamp: Date, equity: number, balance: number }[]> {
    const result = await db.execute(sql`
      SELECT timestamp, equity, balance FROM equity_snapshots
      ORDER BY timestamp DESC LIMIT ${limit}
    `);
    return result.rows.map((r: any) => ({ timestamp: new Date(r.timestamp), equity: Number(r.equity), balance: Number(r.balance) }));
  }

  async getPortfolioHistoryInRange(start: Date, end: Date, period: string = "ALL"): Promise<{ timestamp: Date, equity: number, balance: number }[]> {
    // choose bucket unit
    const unit = period === "1D" ? 'hour' : period === '1W' || period === '1M' ? 'day' : period === '1Y' ? 'month' : 'month';
    const result = await db.execute(sql`
      SELECT date_trunc(${unit}, timestamp) as ts, SUM(equity) as equity, SUM(balance) as balance
      FROM equity_snapshots WHERE timestamp BETWEEN ${start} AND ${end}
      GROUP BY ts ORDER BY ts ASC
    `);
    const rows = result.rows.map((row: any) => ({ timestamp: new Date(row.ts), equity: Number(row.equity), balance: Number(row.balance) }));

    // If there are no snapshot buckets, fall back to aggregated trades
    if (rows.length === 0) {
      const tradeBuckets = await this.getTradesAggregatedInRange(start, end, unit as any);
      // Convert trade buckets into balance/equity points by applying cumulative profit
      let cumulative = 0;
      const out: { timestamp: Date; equity: number; balance: number }[] = [];
      for (const b of tradeBuckets) {
        cumulative += b.profit;
        out.push({ timestamp: b.timestamp, equity: cumulative, balance: cumulative });
      }
      return out;
    }

    return rows;
  }
}

export const storage = new DatabaseStorage();
