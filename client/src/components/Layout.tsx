import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Wallet, Settings } from "lucide-react";
import { clsx } from "clsx";

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout.mutate();
  };

  const navItems = [
    { href: "/", icon: Home, label: "Overview" },
    { href: "/accounts", icon: Wallet, label: "Accounts" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar / Mobile Nav */}
      <nav className="md:w-64 bg-card/40 backdrop-blur-xl border-r border-white/5 flex flex-col sticky top-0 md:h-screen z-50">
        <div className="p-8 pb-4">
          <h1 className="text-3xl font-bold tracking-tighter text-glow" style={{ fontFamily: 'var(--font-display)' }}>
            Arcane
          </h1>
        </div>

        <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                location === item.href 
                  ? "bg-white/10 text-white shadow-lg shadow-black/5" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={clsx(
                "w-5 h-5 transition-transform group-hover:scale-110",
                location === item.href ? "text-white" : "text-muted-foreground group-hover:text-white"
              )} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
