import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session Middleware
  app.use(
    session({
      secret: "arcane_secret_key", // In production use env var
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: { maxAge: 86400000 },
    })
  );

  // Authentication Middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && (req.session as any).user) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };

  // --- Auth Routes ---
  app.post(api.auth.login.path, (req, res) => {
    const { username, password, rememberMe } = req.body;
    // Hardcoded credentials as requested
    if (username === "NoahX36" && password === "ArcaneX36$!Noah100922") {
      (req.session as any).user = { username };
      // If "keep me signed in" is checked, set cookie to 1 year
      if (rememberMe) {
        req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
      }
      res.json({ message: "Logged in" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.check.path, (req, res) => {
    if (req.session && (req.session as any).user) {
      // Refresh the session cookie to 1 year on every page load
      req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
      res.json((req.session as any).user);
    } else {
      res.json(null);
    }
  });


  // --- Account Routes ---
  app.get(api.accounts.list.path, requireAuth, async (req, res) => {
    const accounts = await storage.getAccounts();
    res.json(accounts);
  });

  app.post(api.accounts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.accounts.create.input.parse(req.body);
      const account = await storage.createAccount(input);
      res.status(201).json(account);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get(api.accounts.get.path, requireAuth, async (req, res) => {
    const account = await storage.getAccount(Number(req.params.id));
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  });

  // Debug: list imported trades for an account
  app.get(`${api.accounts.get.path}/trades`, requireAuth, async (req, res) => {
    const accountId = Number(req.params.id);
    const trades = await storage.getTradesByAccount(accountId);
    res.json(trades.map(t => ({ ...t, timestamp: t.timestamp.toISOString() })));
  });

  app.put(api.accounts.update.path, requireAuth, async (req, res) => {
    const input = api.accounts.update.input.parse(req.body);
    const account = await storage.updateAccount(Number(req.params.id), input);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  });

  app.delete(api.accounts.delete.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[api] Deleting account ${id}`);
      await storage.deleteAccount(id);
      return res.status(204).send();
    } catch (err) {
      console.error("Failed to delete account:", err);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Debug: delete trades matching profit and date range (e.g., remove erroneous snapshot-as-trade entries)
  app.post(`${api.accounts.get.path}/trades/cleanup`, requireAuth, async (req, res) => {
    try {
      const accountId = Number(req.params.id);
      const { profit, date, start, end } = req.body as any;
      if (typeof profit !== 'number') return res.status(400).json({ message: 'profit (number) is required' });

      let startDate: Date, endDate: Date;
      if (start && end) {
        startDate = new Date(start);
        endDate = new Date(end);
      } else if (date) {
        const d = new Date(date);
        startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
        endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999);
      } else {
        // default to today
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
      }

      const deleted = await storage.deleteTradesMatching(accountId, profit, startDate, endDate);
      res.json({ deleted });
    } catch (err) {
      console.error('Cleanup error:', err);
      res.status(500).json({ message: 'Failed to cleanup trades' });
    }
  });

  app.get(api.accounts.history.path, requireAuth, async (req, res) => {
    const accountId = Number(req.params.id);
    const period = (req.query.period as string | undefined) ?? "ALL";

    // compute broker-time start/end using server timezone
    // compute strict broker-time start/end for the requested period
    let start: Date;
    let end: Date;
    const now = new Date();
    const startOfDay = (d: Date) => { const s = new Date(d); s.setHours(0,0,0,0); return s; };
    const endOfDay = (d: Date) => { const e = new Date(d); e.setHours(23,59,59,999); return e; };

    if (period === "1D") { start = startOfDay(now); end = endOfDay(now); }
    else if (period === "1W") {
      const day = now.getDay(); // 0=Sunday
      const diffToMonday = (day + 6) % 7; // days since Monday
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0,0,0,0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      start = monday; end = sunday;
    }
    else if (period === "1M") { start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999); }
    else if (period === "1Y") { start = new Date(now.getFullYear(), 0, 1, 0,0,0,0); end = new Date(now.getFullYear(), 11, 31, 23,59,59,999); }
    else {
      // ALL: choose earliest meaningful timestamp: earliest trade, snapshot, or account creation
      const ts = await storage.getAccountEarliestTimestamp(accountId);
      start = ts ? new Date(ts) : new Date(0);
      end = new Date();
    }

    const snapshots = await storage.getAccountHistoryInRange(accountId, start, end);

    // We'll collect results here
    const results: any[] = [];

    // If period is not ALL or snapshots are empty/zero, prefer aggregated trade buckets to compute per-period profit
    const hasNonZeroSnapshot = snapshots.some(s => Number(s.balance) !== 0 || Number(s.equity) !== 0);
    if (period !== "ALL" || snapshots.length === 0 || !hasNonZeroSnapshot) {
      // Determine aggregation unit for buckets
      const unit = period === "1D" ? 'hour' : period === '1W' || period === '1M' ? 'day' : period === '1Y' ? 'month' : 'month';

      // Get aggregated profits per unit
      const tradeBuckets = await storage.getTradesAggregatedInRange(start, end, unit as any);

      // If we have trade buckets, compute per-bucket balances and profit%.
      if (tradeBuckets.length > 0) {
        // Compute startBalance at `start` using current computed balance minus trades after start
        const totalProfitAll = await storage.getTotalProfitFromTrades(accountId);
        const tradeSumBefore = await storage.getTradeSumBefore(accountId, start);
        const acctNow = await storage.getAccount(accountId);
        const currentComputedBalance = acctNow?.balance ?? 0;
        const tradesAfterStart = totalProfitAll - tradeSumBefore;
        let bucketStartBalance = currentComputedBalance - tradesAfterStart;

        // Add synthetic start point
        results.push({ id: `s-${accountId}`, accountId, balance: bucketStartBalance, equity: bucketStartBalance, profit: 0, profitPercent: 0, timestamp: new Date(start) });

        // For each bucket, compute end balance and profit percent
        for (const b of tradeBuckets) {
          const profit = Number(b.profit);
          const startBal = bucketStartBalance;
          const endBal = startBal + profit;
          const denom = endBal - profit; // same as startBal
          const profitPercent = denom > 0 ? (profit / denom) * 100 : 0;
          results.push({ id: `b-${accountId}-${b.timestamp.getTime()}`, accountId, balance: endBal, equity: endBal, profit, profitPercent, timestamp: b.timestamp });
          bucketStartBalance = endBal;
        }

        // Final synthetic end point at period end
        const nowDate = new Date();
        const periodEnd = end > nowDate ? nowDate : end;
        results.push({ id: `e-${accountId}`, accountId, balance: bucketStartBalance, equity: bucketStartBalance, profit: 0, profitPercent: 0, timestamp: new Date(periodEnd) });

        return res.json(results.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })));
      }

      // If no trade buckets, fall back to per-trade progression (previous behavior)
      const trades = await storage.getTradesInRange(accountId, start, end);

      // Compute a realistic starting balance at `start`
      const totalProfitAll = await storage.getTotalProfitFromTrades(accountId);
      const tradeSumBefore = await storage.getTradeSumBefore(accountId, start);
      const acctNow = await storage.getAccount(accountId);
      const currentComputedBalance = acctNow?.balance ?? 0;
      const tradesAfterStart = totalProfitAll - tradeSumBefore;
      let cumulative = currentComputedBalance - tradesAfterStart;

      results.push({ id: `s-${accountId}`, accountId, balance: cumulative, equity: cumulative, profit: 0, profitPercent: 0, timestamp: new Date(start) });

      for (const t of trades) {
        const profit = Number(t.profit);
        const startBal = cumulative;
        cumulative += profit;
        const denom = cumulative - profit; // startBal
        const profitPercent = denom > 0 ? (profit / denom) * 100 : 0;
        results.push({ id: `t-${t.id}`, accountId, balance: cumulative, equity: cumulative, profit, profitPercent, timestamp: t.timestamp });
      }

      const nowDate = new Date();
      const periodEnd = end > nowDate ? nowDate : end;
      results.push({ id: `e-${accountId}`, accountId, balance: cumulative, equity: cumulative, profit: 0, profitPercent: 0, timestamp: new Date(periodEnd) });

      return res.json(results.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })));
    }

    // Start point: prefer snapshot at-or-before start, otherwise first snapshot in range, otherwise synthetic using account balance
    const startSnap = await storage.getAccountSnapshotBeforeOrAt(accountId, start);
    if (startSnap) {
      // synthetic point at exact start time using startSnap balance
      results.push({ id: `s-${accountId}`, accountId, balance: startSnap.balance, equity: startSnap.equity, timestamp: new Date(start) });
    } else if (snapshots.length > 0) {
      results.push({ id: `s-${accountId}`, accountId, balance: snapshots[0].balance, equity: snapshots[0].equity, timestamp: new Date(start) });
    } else {
      // fallback to current account balance
      const acct = await storage.getAccount(accountId);
      results.push({ id: `s-${accountId}`, accountId, balance: acct?.balance ?? 0, equity: acct?.equity ?? 0, timestamp: new Date(start) });
    }

    // Add actual snapshots in range
    for (const s of snapshots) results.push(s);

    // End point: choose latest snapshot <= end or use last snapshot or current account balance; place at min(end, now)
    const nowDate = new Date();
    const periodEnd = end > nowDate ? nowDate : end;
    const endSnap = await storage.getAccountSnapshotBeforeOrAt(accountId, end);
    if (endSnap) {
      results.push({ id: `e-${accountId}`, accountId, balance: endSnap.balance, equity: endSnap.equity, timestamp: new Date(periodEnd) });
    } else if (snapshots.length > 0) {
      results.push({ id: `e-${accountId}`, accountId, balance: snapshots[snapshots.length - 1].balance, equity: snapshots[snapshots.length - 1].equity, timestamp: new Date(periodEnd) });
    } else {
      const acct = await storage.getAccount(accountId);
      results.push({ id: `e-${accountId}`, accountId, balance: acct?.balance ?? 0, equity: acct?.equity ?? 0, timestamp: new Date(periodEnd) });
    }

    // normalize timestamps to ISO
    // Compute per-point profit and profitPercent for snapshot-based series
    let prevBalance: number | null = null;
    for (let i = 0; i < results.length; i++) {
      const bal = Number(results[i].balance ?? 0);
      if (prevBalance === null) {
        results[i].profit = 0;
        results[i].profitPercent = 0;
      } else {
        const profit = bal - prevBalance;
        const denom = prevBalance;
        const profitPercent = denom > 0 ? (profit / denom) * 100 : 0;
        results[i].profit = profit;
        results[i].profitPercent = profitPercent;
      }
      prevBalance = bal;
    }

    res.json(results.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })));
  });

  // --- Account profit endpoint (trades-only) ---
  app.get(`${api.accounts.get.path}/profit`, requireAuth, async (req, res) => {
    const accountId = Number(req.params.id);
    const period = (req.query.period as string | undefined) ?? "ALL";

    const now = new Date();
    let start: Date, end: Date;
    if (period === "1D") { start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999); }
    else if (period === "1W") { const day = now.getDay(); const diffToMonday = (day + 6) % 7; const monday = new Date(now); monday.setDate(now.getDate() - diffToMonday); monday.setHours(0,0,0,0); start = monday; const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999); end = sunday; }
    else if (period === "1M") { start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999); }
    else if (period === "1Y") { start = new Date(now.getFullYear(), 0, 1, 0,0,0,0); end = new Date(now.getFullYear(), 11, 31, 23,59,59,999); }
    else { start = new Date(0); end = new Date(); }

    try {
      const profit = await storage.getAccountProfitInRange(accountId, start, end);
      res.json({ profit });
    } catch (err) {
      console.error('Database error while fetching account profit:', err);
      // Return 503 Service Unavailable so client can retry later; do not crash the server
      res.status(503).json({ message: 'Service unavailable' });
    }
  });

  // --- Portfolio Routes ---
  app.get(api.portfolio.summary.path, requireAuth, async (req, res) => {
    const period = (req.query.period as string | undefined) ?? "ALL";
    const accounts = await storage.getAccounts();

    // compute total balance from latest snapshots + trades since those snapshots (canonical current balance)
    let totalBalance = 0;
    for (const acct of accounts) {
      const current = await storage.getCurrentBalance(acct.id);
      totalBalance += current;
    }

    // compute period start/end matching broker-time ranges
    const now = new Date();
    let start: Date, end: Date;
    if (period === "1D") { start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999); }
    else if (period === "1W") { const day = now.getDay(); const diffToMonday = (day + 6) % 7; const monday = new Date(now); monday.setDate(now.getDate() - diffToMonday); monday.setHours(0,0,0,0); start = monday; const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999); end = sunday; }
    else if (period === "1M") { start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999); }
    else if (period === "1Y") { start = new Date(now.getFullYear(), 0, 1, 0,0,0,0); end = new Date(now.getFullYear(), 11, 31, 23,59,59,999); }
    else { start = new Date(0); end = new Date(); }

    // Sum profit per account over the period using snapshots
    let totalProfit = 0;
    for (const acct of accounts) {
      const profit = await storage.getAccountProfitInRange(acct.id, start, end);
      totalProfit += profit;
    }

    // ROI: (Profit / (Balance - Profit)) * 100
    const totalStartingBalance = totalBalance - totalProfit;
    const totalProfitPercent = totalStartingBalance > 0 ? (totalProfit / totalStartingBalance) * 100 : 0;

    res.json({ totalBalance, totalEquity: accounts.reduce((s,a) => s + a.equity, 0), totalProfit, totalProfitPercent });
  });

  app.get(api.portfolio.history.path, requireAuth, async (req, res) => {

    const period = (req.query.period as string | undefined) ?? "ALL";
    // compute broker-time start/end
    const now = new Date();
    let start: Date, end: Date;
    if (period === "1D") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
    } else if (period === "1W") {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0,0,0,0);
      start = monday;
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      end = sunday;
    } else if (period === "1M") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
    } else if (period === "1Y") {
      start = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
      end = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
    } else {
      // ALL: use earliest account creation/trade/snapshot date across all accounts
      const accounts = await storage.getAccounts();
      let minTs: number | null = null;
      for (const acct of accounts) {
        const ts = await storage.getAccountEarliestTimestamp(acct.id);
        if (ts) {
          if (minTs === null || ts < minTs) {
            minTs = ts;
          }
        }
      }
      // If no timestamps found, use account lastUpdated or current date
      if (minTs === null) {
        // Get earliest account updated date
        const allAccts = await storage.getAccounts();
        if (allAccts.length > 0) {
          minTs = Math.min(...allAccts
            .filter(a => a.lastUpdated)
            .map(a => new Date(a.lastUpdated!).getTime()));
        }
        if (minTs === null) {
          minTs = Date.now();
        }
      }
      start = new Date(minTs);
      end = new Date();
    }

    const history = await storage.getPortfolioHistoryInRange(start, end, period);

    const results: any[] = [];
    // synthetic start aligned to exact 'start' broker-time
    if (history.length > 0 && history.some(h => Number(h.equity) !== 0 || Number(h.balance) !== 0)) {
      results.push({ timestamp: new Date(start), equity: history[0].equity, balance: history[0].balance });
      for (const h of history) results.push(h);
      const nowDate = new Date();
      const periodEnd = end > nowDate ? nowDate : end;
      const last = history[history.length - 1];
      results.push({ timestamp: new Date(periodEnd), equity: last.equity, balance: last.balance });
    } else {
      // Fallback to aggregated trades across accounts
      const unit = period === "1D" ? 'hour' : period === '1W' || period === '1M' ? 'day' : period === '1Y' ? 'month' : 'month';
      const tradeBuckets = await storage.getTradesAggregatedInRange(start, end, unit as any);
      if (tradeBuckets.length > 0) {
        // Compute portfolio starting balance at `start` by summing per-account start balances
        const accounts = await storage.getAccounts();
        let portfolioStartBalance = 0;
        for (const acct of accounts) {
          const totalProfitAll = await storage.getTotalProfitFromTrades(acct.id);
          const tradeSumBefore = await storage.getTradeSumBefore(acct.id, start);
          const acctNow = await storage.getAccount(acct.id);
          const currentComputedBalance = acctNow?.balance ?? 0;
          const tradesAfterStart = totalProfitAll - tradeSumBefore;
          const acctStartBalance = currentComputedBalance - tradesAfterStart;
          portfolioStartBalance += acctStartBalance;
        }

        // Build per-bucket portfolio progression using aggregated trade profits
        let cumulative = portfolioStartBalance;
        results.push({ timestamp: new Date(start), equity: cumulative, balance: cumulative, profit: 0, profitPercent: 0 });
        for (const b of tradeBuckets) {
          const profit = Number(b.profit);
          const startBal = cumulative;
          const endBal = startBal + profit;
          const denom = endBal - profit; // startBal
          const profitPercent = denom > 0 ? (profit / denom) * 100 : 0;
          results.push({ timestamp: b.timestamp, equity: endBal, balance: endBal, profit, profitPercent });
          cumulative = endBal;
        }
        const nowDate = new Date();
        const periodEnd = end > nowDate ? nowDate : end;
        results.push({ timestamp: new Date(periodEnd), equity: cumulative, balance: cumulative, profit: 0, profitPercent: 0 });
      } else {
        // no buckets: add a single point at start and at periodEnd with zero values
        results.push({ timestamp: new Date(start), equity: 0, balance: 0, profit: 0, profitPercent: 0 });
        results.push({ timestamp: new Date(end > new Date() ? new Date() : end), equity: 0, balance: 0, profit: 0, profitPercent: 0 });
      }
    }

    // If this branch used snapshots (history), compute per-point profit and profitPercent similarly
    if (history.length > 0 && history.some(h => Number(h.equity) !== 0 || Number(h.balance) !== 0)) {
      let prevBal: number | null = null;
      for (let i = 0; i < results.length; i++) {
        const bal = Number(results[i].balance ?? 0);
        if (prevBal === null) {
          results[i].profit = 0;
          results[i].profitPercent = 0;
        } else {
          const profit = bal - prevBal;
          const denom = prevBal;
          const profitPercent = denom > 0 ? (profit / denom) * 100 : 0;
          results[i].profit = profit;
          results[i].profitPercent = profitPercent;
        }
        prevBal = bal;
      }
    }

    res.json(results.map(h => ({ timestamp: h.timestamp.toISOString(), equity: h.equity, balance: h.balance, profit: h.profit ?? 0, profitPercent: h.profitPercent ?? 0 })));
  });

  // --- Webhook Route (No Auth Required - Protected by Token) ---
  app.post(api.webhook.mt5.path, async (req, res) => {
    const { token } = req.params;
    const account = await storage.getAccountByToken(token);
    if (!account) {
      return res.status(404).json({ message: "Invalid token" });
    }

    try {
      const body = req.body;

      // If an array is posted, allow a mix of trade records and optional snapshot records
      if (Array.isArray(body)) {
        const tradesPart: any[] = [];
        const snapshots: any[] = [];

        for (const item of body) {
          if (item && typeof item === 'object' && typeof item.t === 'number' && typeof item.p === 'number') {
            tradesPart.push(item);
          } else if (item && typeof item === 'object' && typeof item.balance === 'number') {
            snapshots.push(item);
          }
        }

        // Insert trades if any
        if (tradesPart.length > 0) {
          const tradesToInsert = tradesPart.map((it: any) => ({
            accountId: account.id,
            profit: Number(it.p),
            timestamp: new Date(Number(it.t) * 1000),
          }));
          await storage.addTrades(tradesToInsert);
        }

        // If snapshots were included in the array, apply the latest one to update account balance/equity
        if (snapshots.length > 0) {
          const last = snapshots[snapshots.length - 1];
          await storage.updateAccountStats(account.id, last.balance, last.equity, last.profit ?? await storage.getTotalProfitFromTrades(account.id), last.dailyProfit);
        } else {
          // If no snapshot was provided, recompute profit from trades and update profit fields only
          const tradeTotal = await storage.getTotalProfitFromTrades(account.id);
          await storage.updateAccountStats(account.id, account.balance, account.equity, tradeTotal);
        }

        return res.json({ status: "ok", inserted: tradesPart.length });
      }

      // Otherwise treat as single status update (existing behavior)
      if (body && typeof body === "object") {
        const { balance, equity, profit, dailyProfit } = body;
        await storage.updateAccountStats(account.id, balance, equity, profit, dailyProfit);
        return res.json({ status: "ok" });
      }

      return res.status(400).json({ message: "Unsupported payload" });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const accounts = await storage.getAccounts();
  if (accounts.length === 0) {
    console.log("Seeding database...");
    const acc1 = await storage.createAccount({ name: "MT5 Demo 01" });
    await storage.updateAccountStats(acc1.id, 10000, 10500, 500);

    const acc2 = await storage.createAccount({ name: "Live Scalping" });
    await storage.updateAccountStats(acc2.id, 5000, 4800, -200);

    const acc3 = await storage.createAccount({ name: "Swing Trading" });
    await storage.updateAccountStats(acc3.id, 25000, 26000, 1000);
    
    // Add some history
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const time = new Date(now - i * 86400000);
      await storage.addEquitySnapshot({
        accountId: acc1.id,
        balance: 10000 + (Math.random() * 500),
        equity: 10000 + (Math.random() * 1000),
        timestamp: time
      });
      await storage.addEquitySnapshot({
        accountId: acc2.id,
        balance: 5000 - (Math.random() * 200),
        equity: 5000 - (Math.random() * 300),
        timestamp: time
      });
    }
  }
}
