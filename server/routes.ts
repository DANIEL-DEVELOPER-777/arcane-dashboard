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

  app.put(api.accounts.update.path, requireAuth, async (req, res) => {
    const input = api.accounts.update.input.parse(req.body);
    const account = await storage.updateAccount(Number(req.params.id), input);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  });

  app.delete(api.accounts.delete.path, requireAuth, async (req, res) => {
    await storage.deleteAccount(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.accounts.history.path, requireAuth, async (req, res) => {
    const accountId = Number(req.params.id);
    const period = (req.query.period as string | undefined) ?? "ALL";

    // compute broker-time start/end using server timezone
    const { start, end } = (() => {
      const now = new Date();
      const startOfDay = (d: Date) => { const s = new Date(d); s.setHours(0,0,0,0); return s; };
      const endOfDay = (d: Date) => { const e = new Date(d); e.setHours(23,59,59,999); return e; };
      if (period === "1D") return { start: startOfDay(now), end: endOfDay(now) };
      if (period === "1W") {
        const day = now.getDay(); // 0=Sunday
        const diffToMonday = (day + 6) % 7; // days since Monday
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        monday.setHours(0,0,0,0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23,59,59,999);
        return { start: monday, end: sunday };
      }
      if (period === "1M") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      if (period === "1Y") {
        const start = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
        const end = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
        return { start, end };
      }
      return { start: new Date(0), end: new Date() };
    })();

    const snapshots = await storage.getAccountHistoryInRange(accountId, start, end);

    // Build results and ensure synthetic start/end points aligned to requested broker-time
    const results: any[] = [];

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
    const now = new Date();
    const periodEnd = end > now ? now : end;
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
    res.json(results.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })));
  });

  // --- Portfolio Routes ---
  app.get(api.portfolio.summary.path, requireAuth, async (req, res) => {
    const period = (req.query.period as string | undefined) ?? "ALL";
    const accounts = await storage.getAccounts();

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

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

    const totalStartingBalance = totalBalance - totalProfit;
    const totalProfitPercent = totalStartingBalance > 0 ? (totalProfit / totalStartingBalance) * 100 : 0;

    res.json({ totalBalance, totalEquity: accounts.reduce((s,a) => s + a.equity, 0), totalProfit, totalProfitPercent });
  });

  app.get(api.portfolio.history.path, requireAuth, async (req, res) => {
    const period = (req.query.period as string | undefined) ?? "ALL";

    // compute broker-time start/end
    const now = new Date();
    let start: Date, end: Date;
    if (period === "1D") { start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999); }
    else if (period === "1W") { const day = now.getDay(); const diffToMonday = (day + 6) % 7; const monday = new Date(now); monday.setDate(now.getDate() - diffToMonday); monday.setHours(0,0,0,0); start = monday; const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999); end = sunday; }
    else if (period === "1M") { start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999); }
    else if (period === "1Y") { start = new Date(now.getFullYear(), 0, 1, 0,0,0,0); end = new Date(now.getFullYear(), 11, 31, 23,59,59,999); }
    else { start = new Date(0); end = new Date(); }

    const history = await storage.getPortfolioHistoryInRange(start, end, period);

    const results: any[] = [];
    // synthetic start aligned to exact 'start' broker-time
    if (history.length > 0) {
      results.push({ timestamp: new Date(start), equity: history[0].equity, balance: history[0].balance });
      for (const h of history) results.push(h);
      const nowDate = new Date();
      const periodEnd = end > nowDate ? nowDate : end;
      const last = history[history.length - 1];
      results.push({ timestamp: new Date(periodEnd), equity: last.equity, balance: last.balance });
    } else {
      // no buckets: add a single point at start and at periodEnd with zero values
      results.push({ timestamp: new Date(start), equity: 0, balance: 0 });
      results.push({ timestamp: new Date(end > new Date() ? new Date() : end), equity: 0, balance: 0 });
    }

    res.json(results.map(h => ({ timestamp: h.timestamp.toISOString(), equity: h.equity, balance: h.balance })));
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

      // If an array is posted, treat as MT5 history: [{ t: <unix seconds>, p: <profit> }, ...]
      if (Array.isArray(body)) {
        if (!body.every((item: any) => typeof item.t === "number" && typeof item.p === "number")) {
          return res.status(400).json({ message: "Invalid history payload" });
        }

        const tradesToInsert = (body as any[]).map((it: any) => ({
          accountId: account.id,
          profit: Number(it.p),
          timestamp: new Date(Number(it.t) * 1000),
        }));

        await storage.addTrades(tradesToInsert);

        // Recompute totals from trades and update account stats
        const tradeTotal = await storage.getTotalProfitFromTrades(account.id);

        // Update account profit to match imported history and recalc percent
        await storage.updateAccountStats(account.id, account.balance, account.equity, tradeTotal);

        return res.json({ status: "ok", inserted: tradesToInsert.length });
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
