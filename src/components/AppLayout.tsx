import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-card px-6">
            <div className="flex items-center gap-3 flex-1">
              <SidebarTrigger />
              {user?.role === "counselor" && (
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search students, sessions, or reports..." className="pl-9 bg-secondary/50 border-0 h-9 text-sm" />
                  </div>
                </div>
              )}
              {user?.role === "admin" && (
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search systems, alerts, or personnel..." className="pl-9 bg-secondary/50 border-0 h-9 text-sm" />
                  </div>
                </div>
              )}
              {user?.role === "counselor" && (
                <div className="text-xs text-muted-foreground">
                  <span className="uppercase tracking-wider">Counselor View</span>
                  <p className="font-semibold text-foreground">{user.name}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <HoverCard openDelay={100} closeDelay={150}>
                <HoverCardTrigger asChild>
                  <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/40 transition-all">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {user?.name?.split(" ").map(n => n[0]).join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                </HoverCardTrigger>
                <HoverCardContent align="end" className="w-56 p-0 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 pt-4 pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                          {user?.name?.split(" ").map(n => n[0]).join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Log Out
                  </button>
                </HoverCardContent>
              </HoverCard>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};
