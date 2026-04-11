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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="w-full"
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </CardContent>
          </Card>

          {/* Time slots & booking */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Available Slots</h3>
                  <span className="text-sm text-primary font-medium">{formattedDate}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {timeSlots.map((t) => {
                    const isBooked = bookedSlots.includes(t);
                    const isSelected = selectedTime === t;
                    return (
                      <button
                        key={t}
                        disabled={isBooked}
                        onClick={() => setSelectedTime(t)}
                        className={`rounded-xl border-2 p-3 text-center transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : isBooked
                            ? "border-border bg-secondary/50 opacity-60"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <p className={`text-sm font-semibold ${isSelected ? "text-primary" : ""}`}>{t}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {isBooked ? "Booked" : isSelected ? "Selected" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Add a brief note (Optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell us how you're feeling today..."
                className="bg-secondary/50 border-0"
                rows={3}
              />
            </div>

            {/* Assigned counselor */}
            <Card className="bg-secondary/50 border-0">
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary"><User className="h-5 w-5" /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Assigned Counselor</p>
                  <p className="text-sm font-bold">Dr. Sarah Jenkins</p>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold"
              onClick={handleConfirm}
              disabled={!date || !selectedTime}
            >
              Book Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* Tip */}
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 flex gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Lightbulb className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">Preparation Tip</p>
                  <p className="text-xs text-emerald-700">Finding a quiet, private space for your virtual session can help you feel more comfortable and focused.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BookAppointment;
