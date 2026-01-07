import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { EquityChart } from "@/components/EquityChart";
import { AccountCard } from "@/components/AccountCard";
import { usePortfolioSummary, usePortfolioHistory, useAccounts } from "@/hooks/use-accounts";
import { Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [period, setPeriod] = useState<"1D" | "1W" | "1M" | "1Y" | "ALL">("1D");
  const { data: history, isLoading: historyLoading } = usePortfolioHistory(period);

  if (authLoading) return null;
  if (!user) return <Redirect to="/login" />;

  const isLoading = summaryLoading || accountsLoading;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Portfolio Results Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Portfolio Results</h1>
        </motion.div>

        {/* Stats Section */}
        <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-zinc-500 text-sm font-medium mb-1">Total Balance</h2>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {isLoading ? "..." : formatCurrency(summary?.totalBalance || 0)}
            </h1>
          </div>
          <div className="w-full md:w-auto">
            <p className="text-zinc-400 font-medium mb-1">Profit ({period})</p>
            <div className={clsx(
              "text-3xl md:text-4xl font-bold flex items-center gap-2",
              (summary?.totalProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {(summary?.totalProfit || 0) >= 0 ? <TrendingUp className="w-8 h-8 md:w-10 md:h-10" /> : <TrendingDown className="w-8 h-8 md:w-10 md:h-10" />}
              <span>{formatCurrency(summary?.totalProfit || 0)}</span>
              <span className="text-lg bg-white/[0.03] px-3 py-1 rounded-lg ml-1">
                {summary?.totalProfitPercent !== undefined ? (summary.totalProfitPercent >= 0 ? "+" : "-") : ""}{Math.abs(summary?.totalProfitPercent || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Chart Section */}
        <motion.div variants={item}>
          <EquityChart 
            data={history} 
            onPeriodChange={setPeriod} 
            isLoading={historyLoading} 
          />
        </motion.div>

        {/* Recent Accounts Section */}
        <motion.div variants={item} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Connected Accounts</h3>
            <Link href="/accounts" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
              View All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {accounts?.slice(0, 3).map((account) => (
                <AccountCard key={account.id} account={account} detailed />
              ))}
              {(!accounts || accounts.length === 0) && (
                <div className="col-span-3 py-12 text-center border border-dashed border-white/10 rounded-3xl">
                  <p className="text-zinc-500">No accounts connected yet.</p>
                  <Link href="/accounts" className="text-white underline mt-2 inline-block">Go to Accounts to add one</Link>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </Layout>
  );
}
