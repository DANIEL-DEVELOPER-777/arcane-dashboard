import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { AccountCard } from "@/components/AccountCard";
import { AddAccountDialog } from "@/components/AddAccountDialog";
import { useAccounts } from "@/hooks/use-accounts";
import { Redirect } from "wouter";
import { motion } from "framer-motion";

export default function Accounts() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: accounts, isLoading } = useAccounts();

  if (authLoading) return null;
  if (!user) return <Redirect to="/login" />;

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">My Accounts</h1>
            <p className="text-zinc-400 text-sm">Manage your trading connections</p>
          </div>
          <AddAccountDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts?.map((account) => (
              <motion.div key={account.id} variants={item}>
                <AccountCard account={account} detailed />
              </motion.div>
            ))}
            
            {accounts?.length === 0 && (
              <div className="col-span-full py-20 text-center glass-panel rounded-3xl border-dashed border-white/20">
                <h3 className="text-xl text-white font-medium mb-2">No accounts found</h3>
                <p className="text-zinc-500 mb-6">Add your first MetaTrader 5 account to get started.</p>
                <AddAccountDialog />
              </div>
            )}
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
