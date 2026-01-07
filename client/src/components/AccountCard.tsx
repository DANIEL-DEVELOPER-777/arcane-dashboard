import { Account } from "@shared/schema";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { clsx } from "clsx";

interface AccountCardProps {
  account: Account;
  detailed?: boolean;
}

export function AccountCard({ account, detailed = false }: AccountCardProps) {
  const isProfit = account.profit >= 0;
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <Link href={`/accounts/${account.id}`} className="block h-full group">
      <div className={clsx(
        "glass-panel rounded-3xl p-6 h-full flex flex-col justify-between relative overflow-hidden",
        "transition-all duration-300 hover:shadow-2xl hover:shadow-white/5",
        "border border-white/5 hover:border-white/20"
      )}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-medium text-white/90 text-lg tracking-tight">{account.name}</h3>
            </div>
            <p className="text-muted-foreground text-xs font-mono tracking-wider opacity-60">ID: {account.id.toString().padStart(4, '0')}</p>
          </div>
          {detailed && (
            <div className="bg-white/5 rounded-full p-2 group-hover:bg-white/10 transition-colors">
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Balance</p>
            <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(account.balance)}</p>
          </div>
          
          <div className="pt-4 border-t border-white/5">
            <p className="text-muted-foreground text-xs mb-1">Profit</p>
            <div className={clsx(
              "flex items-center gap-2 font-bold text-xl",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{formatCurrency(account.profit)}</span>
              <span className="text-sm bg-white/[0.03] px-2 py-0.5 rounded-md">
                {account.profitPercent > 0 ? "+" : ""}{account.profitPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
