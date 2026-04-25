import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, LogOut, MoreHorizontal, X } from "lucide-react";
import { Logo } from "./Logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  end?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}

export function AppSidebar({ items }: { items: SidebarItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const width = collapsed ? 64 : 220;

  const renderItem = (it: SidebarItem) => {
    const inner = (active: boolean) => (
      <div
        className={cn(
          "relative flex items-center h-11 mx-2 rounded-xl px-3 text-sm font-medium transition-colors group",
          it.disabled
            ? "text-muted-foreground/50 opacity-60 cursor-not-allowed"
            : active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
        )}
      >
        {active && !it.disabled && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
        )}
        <it.icon className={cn("h-5 w-5 shrink-0", active && !it.disabled && "text-primary")} />
        {!collapsed && <span className="ml-3 truncate">{it.label}</span>}
        {!collapsed && it.badge && (
          <span className="ml-auto px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
            {it.badge}
          </span>
        )}
      </div>
    );

    const node = it.disabled ? (
      <button onClick={() => toast.info("Please complete your check-in first 🌿")} className="w-full text-left">
        {inner(false)}
      </button>
    ) : it.onClick ? (
      <button onClick={it.onClick} className="w-full text-left">
        {inner(false)}
      </button>
    ) : (
      <NavLink to={it.to!} end={it.end}>
        {({ isActive }) => inner(isActive && !it.disabled)}
      </NavLink>
    );

    return (
      <Tooltip key={it.label}>
        <TooltipTrigger asChild>
          <div>{node}</div>
        </TooltipTrigger>
        {collapsed && <TooltipContent side="right">{it.label}</TooltipContent>}
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        style={{ width }}
        className={cn(
          "hidden md:flex fixed left-0 top-0 h-screen z-40 flex-col bg-card border-r border-border transition-[width] duration-300 ease-out"
        )}
      >
        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-border", collapsed ? "justify-center" : "px-5")}>
          <Logo showWordmark={!collapsed} />
        </div>

        {/* Items */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-none">
          {items.map(renderItem)}
        </nav>

        {/* Spacer + logout */}
        <div className="p-2 border-t border-border space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className={cn(
                  "w-full flex items-center h-11 mx-0 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                )}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="ml-3">Logout</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center h-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
      {/* Spacer to offset fixed sidebar */}
      <div style={{ width }} className="hidden md:block shrink-0 transition-[width] duration-300" aria-hidden />
    </TooltipProvider>
  );
}

export function AppShell({ items, children }: { items: SidebarItem[]; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isStudentOrAdmin = user?.role === "student" || user?.role === "admin";
  
  // Truncate for student/admin to 3 items + "More"
  const visibleItems = isStudentOrAdmin ? items.slice(0, 3) : items;
  const hiddenItems = isStudentOrAdmin ? items.slice(3) : [];
  
  // Add Logout to hidden items
  const drawerItems = [
    ...hiddenItems,
    { icon: LogOut, label: "Logout", onClick: () => { logout(); navigate("/login"); } }
  ];

  const activeColor = user?.role === "student" ? "text-primary" : "text-[#8b5cf6]";

  return (
    <div className="flex min-h-screen w-full bg-background pb-[calc(env(safe-area-inset-bottom)+60px)] md:pb-0 overflow-x-hidden">
      <AppSidebar items={items} />
      <main className="flex-1 min-w-0">{children}</main>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div 
          className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer Content */}
      <div className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-[70] bg-[#1A1A1A] border-t border-border/10 rounded-t-3xl transition-transform duration-300 ease-out",
        drawerOpen ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">More Options</span>
            <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-1">
            {drawerItems.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setDrawerOpen(false);
                  if (it.onClick) it.onClick();
                  else if (it.to) navigate(it.to);
                }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-white/5 text-foreground transition"
              >
                <it.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#1A1A1A] border-t border-border/10 pb-safe flex">
        {visibleItems.map((it) => {
          const inner = (active: boolean) => (
            <div
              className={cn(
                "flex-1 flex justify-center items-center h-[60px] min-h-[44px] min-w-[44px]",
                it.disabled
                  ? "opacity-50"
                  : active
                  ? activeColor
                  : "text-muted-foreground"
              )}
            >
              <it.icon className="h-6 w-6" />
            </div>
          );

          if (it.disabled) {
            return (
              <button key={it.label} onClick={() => toast.info("Please complete your check-in first 🌿")} className="flex-1">
                {inner(false)}
              </button>
            );
          }
          if (it.onClick) {
            return (
              <button key={it.label} onClick={it.onClick} className="flex-1">
                {inner(false)}
              </button>
            );
          }
          return (
            <NavLink key={it.label} to={it.to!} end={it.end} className="flex-1">
              {({ isActive }) => inner(isActive && !it.disabled)}
            </NavLink>
          );
        })}

        {/* More Button */}
        {isStudentOrAdmin && (
          <button 
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex-1 flex justify-center items-center h-[60px]",
              drawerOpen ? activeColor : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>
        )}
      </nav>
    </div>
  );
}
