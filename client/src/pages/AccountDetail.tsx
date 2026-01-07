import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { EquityChart } from "@/components/EquityChart";
import { useAccount, useAccountHistory, useUpdateAccount, useDeleteAccount } from "@/hooks/use-accounts";
import { useRoute, Redirect, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Trash2, Edit2, Check, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function AccountDetail() {
  const { user, isLoading: authLoading } = useAuth();
  const [, params] = useRoute("/accounts/:id");
  const id = params ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: account, isLoading: accountLoading } = useAccount(id);
  const [period, setPeriod] = useState<"1D" | "1W" | "1M" | "1Y" | "ALL">("1D");
  const { data: history, isLoading: historyLoading } = useAccountHistory(id, period);
  
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (authLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (!accountLoading && !account) return <Redirect to="/accounts" />;

  const apiUrl = `${window.location.origin}/api/webhook/mt5/${account?.token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "API URL copied to clipboard" });
  };

  const handleUpdate = async () => {
    if (!newName.trim()) return;
    await updateAccount.mutateAsync({ id, name: newName });
    setIsEditing(false);
    toast({ title: "Updated", description: "Account name updated successfully" });
  };

  const handleDelete = async () => {
    await deleteAccount.mutateAsync(id);
    toast({ title: "Deleted", description: "Account removed successfully" });
    setLocation("/accounts");
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const isProfit = (account?.profit || 0) >= 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Link href="/accounts" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors shrink-0 mt-1">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-wrap w-full">
                    <input 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={account?.name}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-lg md:text-xl font-bold text-white focus:outline-none flex-1 min-w-0"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={handleUpdate} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsEditing(false)} className="text-zinc-500 text-sm hover:text-white px-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight break-words">{account?.name}</h1>
                    <button 
                      onClick={() => { setIsEditing(true); setNewName(account?.name || ""); }}
                      className="text-zinc-600 hover:text-white transition-colors shrink-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-zinc-400 text-xs mt-1">ID: {account?.id.toString().padStart(4, '0')} • Updated: {new Date(account?.lastUpdated || "").toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-zinc-500 text-sm font-medium mb-1">Balance</h2>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {accountLoading ? "..." : formatCurrency(account?.balance || 0)}
            </h1>
          </div>
          <div>
            <p className="text-zinc-400 font-medium mb-1">Profit ({period})</p>
            <div className={clsx(
              "text-2xl md:text-4xl font-bold flex items-center gap-2 flex-wrap",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              {isProfit ? <TrendingUp className="w-6 h-6 md:w-10 md:h-10" /> : <TrendingDown className="w-6 h-6 md:w-10 md:h-10" />}
              <span>{formatCurrency(account?.profit || 0)}</span>
              <span className="text-base md:text-lg bg-white/[0.03] px-2 md:px-3 py-0.5 md:py-1 rounded-lg">
                {account?.profitPercent !== undefined ? (account.profitPercent >= 0 ? "+" : "-") : ""}{Math.abs(account?.profitPercent || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <EquityChart 
          data={history} 
          onPeriodChange={setPeriod} 
          isLoading={historyLoading} 
        />

        {/* API Connection Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 md:p-3 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-white mb-1">Connect MetaTrader 5</h3>
                <p className="text-zinc-400 text-xs md:text-sm">
                  Add this URL to your MT5 Expert Advisor settings to enable real-time tracking.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-black/40 border border-white/10 rounded-xl p-2 md:p-3">
              <code className="font-mono text-[10px] md:text-sm text-zinc-300 break-all py-1 px-2 select-all leading-relaxed">
                {apiUrl}
              </code>
              <button
                onClick={handleCopy}
                className={clsx(
                  "w-full px-4 py-2.5 rounded-lg transition-all font-medium flex items-center justify-center gap-2",
                  copied ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm">{copied ? "Copied" : "Copy URL"}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Delete Account Section */}
        <div className="pt-8 border-t border-white/5">
          <Dialog open={showDelete} onOpenChange={setShowDelete}>
            <DialogTrigger asChild>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </DialogTrigger>
            <DialogContent className="glass-panel bg-zinc-950 text-white border-white/10 w-[calc(100%-2rem)] max-w-md sm:w-full">
              <DialogHeader>
                <DialogTitle>Delete Account?</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Are you sure you want to delete this account? This action cannot be undone and all historical data will be lost.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 mt-4">
                <button onClick={() => setShowDelete(false)} className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                <button 
                  onClick={handleDelete} 
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium shadow-lg shadow-red-900/20 transition-colors"
                  data-testid="button-confirm-delete"
                >
                  Delete Permanently
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
