import { Account } from "@shared/schema";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAccountHistory, useAccountProfit } from "@/hooks/use-accounts";

interface AccountCardProps {
  account: Account;
  detailed?: boolean;
}

export function AccountCard({ account, detailed = false }: AccountCardProps) {
  // Fetch today's trade-based profit for this account
  const { data: todayHistory, isLoading } = useAccountHistory(account.id, "1D");
  const { data: todayProfit, isLoading: isProfitLoading } = useAccountProfit(account.id, "1D");

  const hist = todayHistory || [];
  const startBalance = hist.length > 0 ? hist[0].balance : (account?.balance ?? 0);
  const derivedDailyProfit = todayProfit ?? 0;
  // Use Net Daily Profit divided by the day's starting balance as the percent basis
  const derivedDailyPercent = startBalance > 0 ? (derivedDailyProfit / startBalance) * 100 : 0;
  const dailyProfit = (isLoading || isProfitLoading) ? (account.dailyProfit ?? 0) : derivedDailyProfit;
  const dailyProfitPercent = (isLoading || isProfitLoading) ? (account.dailyProfitPercent ?? 0) : derivedDailyPercent;
  const isProfit = dailyProfit >= 0;

  return (
    <Link href={`/accounts/${account.id}`} className="block h-full group">
      <div className={clsx(
        "glass-panel rounded-3xl p-6 h-full flex flex-col justify-between relative overflow-hidden",
        "transition-all duration-300 hover:shadow-2xl hover:shadow-white/5",
        "border border-white/5 hover:border-white/20"
      )}>
        <div className="flex justify-between items-center mb-6 gap-2">
          <h3 className="font-bold text-white/90 text-2xl md:text-lg tracking-tight">{account.name}</h3>
          {detailed && (
            <div className="bg-white/5 rounded-full p-2 shrink-0">
              <ArrowRight className="w-5 h-5 text-zinc-400" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Balance</p>
            <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(account.balance)}</p>
          </div>
          
          <div className="pt-4 border-t border-white/5">
            <p className="text-muted-foreground text-xs mb-1">Daily Profit</p>
            <div className={clsx(
              "flex items-center gap-2 font-bold text-xl",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{formatCurrency(dailyProfit)}</span>
              <span className="text-sm bg-white/[0.03] px-2 py-0.5 rounded-md">{formatPercent(dailyProfitPercent)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
