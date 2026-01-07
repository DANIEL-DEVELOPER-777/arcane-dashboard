import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Wallet, Menu } from "lucide-react";
import { clsx } from "clsx";
import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const prevLocation = useRef(location);

  useEffect(() => {
    if (prevLocation.current !== location) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      prevLocation.current = location;
    }
  }, [location]);

  const handleLogout = () => {
    logout.mutate();
  };

  const navItems = [
    { href: "/", icon: Home, label: "Overview" },
    { href: "/accounts", icon: Wallet, label: "Accounts" },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
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
            onClick={() => setOpen(false)}
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
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <h1 className="text-xl font-bold tracking-tighter text-glow">Arcane</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="p-0 bg-zinc-950 border-b border-white/10 h-auto max-h-[80vh]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col">
              <div className="px-4 pt-12 pb-4 space-y-2">
                {navItems.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      location === item.href 
                        ? "bg-white/10 text-white shadow-lg shadow-black/5" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                    data-testid={`link-nav-${item.label.toLowerCase()}`}
                  >
                    <item.icon className={clsx(
                      "w-5 h-5 transition-transform group-hover:scale-110",
                      location === item.href ? "text-white" : "text-muted-foreground group-hover:text-white"
                    )} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="px-4 py-4 border-t border-white/5">
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-red-400 transition-colors"
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <nav className="hidden md:flex w-64 bg-card/40 backdrop-blur-xl border-r border-white/5 flex-col sticky top-0 h-screen z-50">
          <NavContent />
        </nav>

        {/* Main Content */}
        <main className="flex-1 md:overflow-y-auto relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
