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
    if (username === "NoahX36" && password === "NoahXArcane!36$2001") {
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
    const history = await storage.getAccountHistory(Number(req.params.id));
    res.json(history);
  });

  // --- Portfolio Routes ---
  app.get(api.portfolio.summary.path, requireAuth, async (req, res) => {
    const accounts = await storage.getAccounts();
    const summary = accounts.reduce(
      (acc, account) => ({
        totalBalance: acc.totalBalance + account.balance,
        totalEquity: acc.totalEquity + account.equity,
        totalProfit: acc.totalProfit + account.profit,
      }),
      { totalBalance: 0, totalEquity: 0, totalProfit: 0 }
    );

    const totalProfitPercent = summary.totalBalance > 0 
      ? (summary.totalProfit / summary.totalBalance) * 100 
      : 0;

    res.json({ ...summary, totalProfitPercent });
  });

  app.get(api.portfolio.history.path, requireAuth, async (req, res) => {
    const history = await storage.getPortfolioHistory();
    // Transform for frontend if needed, but storage returns format matching schema mostly
    res.json(history.map(h => ({
      timestamp: h.timestamp.toISOString(),
      equity: h.equity,
      balance: h.balance
    })));
  });

  // --- Webhook Route (No Auth Required - Protected by Token) ---
  app.post(api.webhook.mt5.path, async (req, res) => {
    const { token } = req.params;
    const { balance, equity, profit } = req.body;

    const account = await storage.getAccountByToken(token);
    if (!account) {
      return res.status(404).json({ message: "Invalid token" });
    }

    await storage.updateAccountStats(account.id, balance, equity, profit);
    res.json({ status: "ok" });
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
