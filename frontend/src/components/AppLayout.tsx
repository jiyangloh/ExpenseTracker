import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FolderKanban, Receipt, Wallet, FileUp, LayoutGrid } from "lucide-react";
import { USE_MOCK } from "@/lib/api";

const NAV = [
  { to: "/", label: "Projects", icon: FolderKanban, end: true },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/income", label: "Income", icon: Wallet },
  { to: "/pdf-import", label: "PDF Import", icon: FileUp },
];

const AppLayout = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
          <div className="px-6 py-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-sm bg-brand-dark grid place-items-center text-brand-foreground font-mono font-semibold">
                E
              </div>
              <div>
                <div className="font-mono text-sm font-semibold tracking-wide text-brand-dark">
                  EXPENSE TRACKER
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Project Ledger
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-dark text-brand-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="px-4 py-3 border-t border-border text-[11px] text-muted-foreground">
            {USE_MOCK ? (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span>Demo mode (mock data)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span>Connected to backend</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top nav */}
          <header className="md:hidden border-b border-border bg-card sticky top-0 z-20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="font-mono text-sm font-semibold tracking-wide text-brand-dark">
                EXPENSE TRACKER
              </div>
            </div>
            <div className="flex overflow-x-auto px-2 pb-2 gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap ${
                      active
                        ? "bg-brand-dark text-brand-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </header>

          <main className="flex-1 px-4 md:px-8 py-6 md:py-10 max-w-[1400px] w-full mx-auto animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
