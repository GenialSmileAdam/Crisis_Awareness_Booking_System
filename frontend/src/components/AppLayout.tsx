import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

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
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[10px] text-accent-foreground flex items-center justify-center">3</span>
              </Button>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-semibold">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.subtitle}</p>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.name?.split(" ").map(n => n[0]).join("") || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};
