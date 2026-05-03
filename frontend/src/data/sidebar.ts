import { Home, ClipboardList, Calendar, History, MessageSquare, BookOpen, LayoutDashboard, Users, Settings, Library } from "lucide-react";
import { SidebarItem } from "@/components/AppSidebar";

export const studentSidebarItems: SidebarItem[] = [
  { icon: Home, label: "Home", to: "/student", end: true },
  { icon: ClipboardList, label: "Check-in", to: "/student/checkin" },
  { icon: Calendar, label: "Appointments", to: "/student/appointments" },
  { icon: History, label: "My History", to: "/student/history" },
  { icon: MessageSquare, label: "Forum", to: "/student/forum" },
  { icon: BookOpen, label: "Resources", to: "/student/resources" },
];

export const counselorSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/counselor", end: true },
  { icon: Users, label: "My Students", to: "/counselor/students" },
  { icon: Calendar, label: "Sessions", to: "/counselor/sessions" },
  { icon: MessageSquare, label: "Forum", to: "/counselor/forum" },
];

export const adminSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Overview", to: "/admin", end: true },
  { icon: Users, label: "User Management", to: "/admin/users" },
  { icon: MessageSquare, label: "Forum", to: "/admin/forum" },
  { icon: Library, label: "Resources", to: "/admin/resources" },
  { icon: Settings, label: "Settings", to: "/admin/settings" },
];
