import {
  LayoutDashboard, CalendarPlus, Clock, Brain, Users, Shield, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarFooter,
} from "@/components/ui/sidebar";

const studentLinks = [
  { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
  { title: "Book Appointment", url: "/student/book-appointment", icon: CalendarPlus },
  { title: "Sessions", url: "/student/sessions", icon: Clock },
];

const counselorLinks = [
  { title: "Dashboard", url: "/counselor/dashboard", icon: LayoutDashboard },
  { title: "Sessions", url: "/counselor/sessions", icon: Clock },
  { title: "AI Summaries", url: "/counselor/ai-summary", icon: Brain },
  { title: "Engagement", url: "/counselor/family-engagement", icon: Users },
];

const adminLinks = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
];

const familyLinks = [
  { title: "Dashboard", url: "/family/dashboard", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const links = user?.role === "student" ? studentLinks
    : user?.role === "counselor" ? counselorLinks
    : user?.role === "admin" ? adminLinks
    : familyLinks;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-background pt-2">
        {/* Logo */}
        <div className={`py-3 flex items-center gap-2 ${collapsed ? "justify-center px-0" : "px-4"}`}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-primary">Crisis Awareness</p>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                {user?.role === "student" ? "Student Management Portal" : "Management Portal"}
              </p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      activeClassName="bg-primary text-primary-foreground font-medium"
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-background border-t border-border/50">
        {collapsed ? (
          /* Collapsed: centered logout icon */
          <div className="flex flex-col items-center py-3">
            <button
              onClick={handleLogout}
              title="Log Out"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {user?.role === "counselor" && (
              <div className="mb-1">
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Crisis Hotline</p>
                <p className="text-sm font-semibold text-foreground">+234 8093824230</p>
                <button className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1">
                  📞 DIRECT LIAISON
                </button>
              </div>
            )}
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
