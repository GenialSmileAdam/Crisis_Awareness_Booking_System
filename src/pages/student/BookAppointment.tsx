import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockCounselors, timeSlots } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

const BookAppointment = () => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedCounselor, setSelectedCounselor] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!date || !selectedCounselor || !selectedTime) {
      toast({ title: "Missing info", description: "Please select a date, counselor, and time slot.", variant: "destructive" });
      return;
    }
    toast({ title: "Appointment Booked!", description: `Scheduled for ${date.toLocaleDateString()} at ${selectedTime}.` });
    setDate(undefined);
    setSelectedCounselor(null);
    setSelectedTime(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Book Appointment</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Select Date</CardTitle></CardHeader>
            <CardContent>
              <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Select Counselor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {mockCounselors.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCounselor(c.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${selectedCounselor === c.id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                >
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.specialization}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Select Time</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((t) => (
                  <Button
                    key={t}
                    variant={selectedTime === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
              <Button className="w-full mt-4" onClick={handleConfirm} disabled={!date || !selectedCounselor || !selectedTime}>
                Confirm Booking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default BookAppointment;
