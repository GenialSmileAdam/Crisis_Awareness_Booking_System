import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { NeonSpinner } from "@/components/NeonSpinner";

export default function CounselorAvailability() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell items={counselorSidebarItems}>
      <div className="flex items-center justify-between py-4 h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="font-display text-xl font-bold">My Availability</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Set your weekly schedule and manage busy blocks</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="rounded-full h-9 w-9 md:hidden">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <AvailabilityCalendar />
      </div>
    </AppShell>
  );
}
