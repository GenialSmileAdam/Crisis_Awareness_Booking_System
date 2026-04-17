import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/AppLayout";
import { mockCounselors, timeSlots } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Lightbulb, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBooking } from "@/contexts/BookingContext";
import { useNavigate } from "react-router-dom";

const BookAppointment = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [note, setNote] = useState("");
  const bookedSlots = ["09:00 AM"];
  const { addBooking } = useBooking();
  const navigate = useNavigate();

  const handleConfirm = () => {
    if (!date || !selectedTime) {
      toast({ title: "Missing info", description: "Please select a date and time slot.", variant: "destructive" });
      return;
    }

    addBooking({
      date,
      time: selectedTime,
      counselorName: "Dr. Sarah Jenkins",
      sessionType: "Cognitive Behavioral Therapy",
      note,
    });

    toast({
      title: "Appointment Booked!",
      description: `Scheduled for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${selectedTime}.`,
    });

    navigate("/student/sessions");
  };

  const formattedDate = date ? date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Book Appointment</h1>
          <p className="text-muted-foreground mt-1">Select a preferred time for your counseling session.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Calendar & Additional Info */}
          <div className="space-y-6">
            <div className="w-full relative z-10">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="w-full p-2 bg-transparent border-0"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  table: "w-full border-collapse",
                  head_row: "flex w-full justify-between mb-2",
                  head_cell: "text-muted-foreground w-full font-bold text-[0.8rem] uppercase",
                  row: "flex w-full mt-2 justify-between gap-1",
                  cell: "h-10 sm:h-12 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20 flex justify-center items-center",
                  day: "h-10 w-10 sm:h-12 sm:w-12 p-0 font-normal aria-selected:opacity-100 rounded-full mx-auto hover:bg-accent hover:text-accent-foreground transition-colors",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-md shadow-primary/20 scale-[1.05]",
                  day_today: "bg-secondary text-secondary-foreground font-bold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-30",
                }}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>

            {/* Preparation Tip moved here for visual balance */}
            <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
              <CardContent className="p-5 flex gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Lightbulb className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800 mb-1">Preparation Tip</p>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Finding a quiet, private space for your virtual session can help you feel more comfortable and focused. Check your internet connection 5 minutes prior.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Time slots & booking details combined into one Card */}
          <Card className="shadow-none border-0 bg-transparent lg:bg-card lg:border lg:shadow-sm lg:rounded-2xl">
            <CardContent className="p-0 lg:p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Select a Time</h3>
                <span className="text-sm text-primary font-semibold py-1 px-3 bg-primary/10 rounded-full">
                  {formattedDate || "No date selected"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlots.map((t) => {
                  const isBooked = bookedSlots.includes(t);
                  const isSelected = selectedTime === t;
                  return (
                    <button
                      key={t}
                      disabled={isBooked}
                      onClick={() => setSelectedTime(t)}
                      className={`rounded-xl border-2 p-2.5 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary shadow-[0_0_0_3px_rgba(var(--primary),0.2)] text-primary-foreground scale-[1.02]"
                          : isBooked
                          ? "border-border bg-secondary/30 opacity-50 cursor-not-allowed"
                          : "border-border hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{t}</p>
                      <p className={`text-[9px] uppercase font-bold mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {isBooked ? "Booked" : isSelected ? "Selected" : "Available"}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Note & Counselor Container */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Note (Optional)</label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Focus for today..."
                    className="bg-secondary/30 resize-none rounded-xl text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 shrink-0">Assigned To</label>
                  <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-3 border border-primary/10 flex-1">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">SJ</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground text-sm">Dr. Sarah Jenkins</p>
                      <p className="text-[10px] text-primary font-bold">Counselor</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all"
                onClick={handleConfirm}
                disabled={!date || !selectedTime}
              >
                Confirm Appointment <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default BookAppointment;
