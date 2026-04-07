import {
  LayoutDashboard, CalendarPlus, History, Brain, Users, UserCircle, ClipboardList, Home,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const studentLinks = [
  { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
  { title: "Book Appointment", url: "/student/book-appointment", icon: CalendarPlus },
  { title: "My Sessions", url: "/student/sessions", icon: History },
  { title: "AI Summary", url: "/student/ai-summary", icon: Brain },
];

const counselorLinks = [
  { title: "Dashboard", url: "/counselor/dashboard", icon: LayoutDashboard },
  { title: "Session History", url: "/counselor/sessions", icon: ClipboardList },
  { title: "Student List", url: "/counselor/students", icon: Users },
  { title: "AI Summary", url: "/counselor/ai-summary", icon: Brain },
  { title: "Family Engagement", url: "/counselor/family-engagement", icon: UserCircle },
];

const adminLinks = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
];

const familyLinks = [
  { title: "Dashboard", url: "/family/dashboard", icon: Home },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();

  const links = user?.role === "student" ? studentLinks
    : user?.role === "counselor" ? counselorLinks
    : user?.role === "admin" ? adminLinks
    : familyLinks;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
