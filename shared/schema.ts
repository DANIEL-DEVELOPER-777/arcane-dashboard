import { pgTable, text, serial, doublePrecision, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(), // The API token/path for MT5
  balance: doublePrecision("balance").default(0).notNull(),
  equity: doublePrecision("equity").default(0).notNull(),
  profit: doublePrecision("profit").default(0).notNull(),
  profitPercent: doublePrecision("profit_percent").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const equitySnapshots = pgTable("equity_snapshots", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  equity: doublePrecision("equity").notNull(),
  balance: doublePrecision("balance").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Schema for inserting a new account (user provides name only)
export const insertAccountSchema = createInsertSchema(accounts).pick({
  name: true,
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type EquitySnapshot = typeof equitySnapshots.$inferSelect;

// API Types
export type CreateAccountRequest = InsertAccount;
export type UpdateAccountRequest = Partial<InsertAccount>;

export interface PortfolioSummary {
  totalBalance: number;
  totalEquity: number;
  totalProfit: number;
  totalProfitPercent: number;
}

export interface AccountWithDailyProfit extends Account {
  dailyProfit: number;
  dailyProfitPercent: number;
}
