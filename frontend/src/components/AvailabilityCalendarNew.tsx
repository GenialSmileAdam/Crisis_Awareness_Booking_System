import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSaveSchedule } from "@/hooks/mutations";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 10 }, (_, i) => ({
  hour: i + 9,
  display: `${(i + 9) % 12 || 12}:00 ${i + 9 >= 12 ? "PM" : "AM"}`,
}));

export function AvailabilityCalendarNew() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 7)); // June 2026
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayAvailability, setDayAvailability] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: saveScheduleMutate } = useSaveSchedule();

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return {
      daysCount,
      startingDayOfWeek,
      year,
      month,
    };
  }, [currentDate]);

  // Load availability for selected day
  const loadDayAvailability = (date: Date) => {
    // Default to available for all hours
    const availability: Record<string, boolean> = {};
    HOURS.forEach((h) => {
      availability[h.hour] = true;
    });
    setDayAvailability(availability);
  };

  const handleDayClick = (day: number) => {
    const date = new Date(daysInMonth.year, daysInMonth.month, day);
    setSelectedDay(date);
    loadDayAvailability(date);
  };

  const handleHourToggle = (hour: number) => {
    setDayAvailability((prev) => ({
      ...prev,
      [hour]: !prev[hour],
    }));
  };

  const handleSaveDaySchedule = async () => {
    if (!selectedDay) return;

    setIsSaving(true);
    try {
      const dayOfWeek = selectedDay.getDay();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const selectedDayName = dayNames[dayOfWeek];

      // Find earliest and latest selected hours
      const selectedHours = Object.keys(dayAvailability)
        .filter((hour) => dayAvailability[parseInt(hour)])
        .map((h) => parseInt(h))
        .sort((a, b) => a - b);

      if (selectedHours.length === 0) {
        toast.error("Please select at least one hour");
        setIsSaving(false);
        return;
      }

      const startHour = selectedHours[0];
      const endHour = selectedHours[selectedHours.length - 1] + 1; // +1 to get the end of the last hour

      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endTime = `${String(endHour).padStart(2, "0")}:00`;

      // Build schedule for the entire week with same times each day
      const schedule = dayNames.map((day) => ({
        day: day,
        start_time: startTime,
        end_time: endTime,
      }));

      // Save the full week schedule
      await saveScheduleMutate({ schedule });

      toast.success(`Schedule saved for ${selectedDayName}!`);
      setSelectedDay(null);
    } catch (error) {
      toast.error("Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  // Render calendar days
  const calendarDays = [];
  const { daysCount, startingDayOfWeek } = daysInMonth;

  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Days of month
  for (let day = 1; day <= daysCount; day++) {
    calendarDays.push(day);
  }

  const monthName = new Date(daysInMonth.year, daysInMonth.month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <div className="space-y-6">
      {/* Month Calendar */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{monthName}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => (
            <button
              key={idx}
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              className={cn(
                "aspect-square rounded-lg border transition-all flex items-center justify-center font-medium text-sm",
                !day && "invisible",
                day &&
                  (selectedDay?.getDate() === day
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted border-border hover:border-primary cursor-pointer")
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">{selectedDay.toDateString()}</h3>
              <p className="text-sm text-muted-foreground">Select your available hours</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Hour grid */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {HOURS.map(({ hour, display }) => (
              <button
                key={hour}
                onClick={() => handleHourToggle(hour)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                  dayAvailability[hour]
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted border-border hover:border-muted-foreground"
                )}
              >
                <div className="text-xs opacity-75">{display}</div>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSaveDaySchedule}
              disabled={isSaving}
              className="flex-1 bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold"
            >
              <Clock className="h-4 w-4 mr-2" />
              Save Schedule
            </Button>
            <Button variant="outline" onClick={() => setSelectedDay(null)} className="flex-1">
              Cancel
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground mt-4">
            💡 Selected hours will be saved and available for students to book. This applies to the entire month.
          </p>
        </div>
      )}

      {/* Busy Blocks Section */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Blocked Times</h3>
            <p className="text-sm text-muted-foreground">Times you're unavailable</p>
          </div>
          <Button className="bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold">
            + Add Block
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">No blocked times yet</p>
      </div>
    </div>
  );
}
