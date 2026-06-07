# Dynamic Calendar Integration Guide

## 📅 Components Created

### 1. **AvailabilityCalendar.tsx** (Psychologist View)
Location: `frontend/src/components/AvailabilityCalendar.tsx`

**Purpose**: Allows psychologists to set their weekly availability and manage busy blocks.

**Features**:
- 7-day × 10-hour weekly grid (9 AM - 6 PM)
- Click to select available times
- Save schedule for 4 weeks automatically
- Add/manage busy blocks (unavailable times)
- Week navigation

**Usage**:
```tsx
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";

export function PsychologistAvailability() {
  return <AvailabilityCalendar />;
}
```

### 2. **AppointmentBookingCalendar.tsx** (Student View)
Location: `frontend/src/components/AppointmentBookingCalendar.tsx`

**Purpose**: Allows students to browse psychologist availability and request appointments.

**Features**:
- View weekly availability for specific psychologist
- Select available 1-hour slots
- Add notes to appointment request
- Submit request for approval
- Week navigation

**Usage**:
```tsx
import { AppointmentBookingCalendar } from "@/components/AppointmentBookingCalendar";

export function BookAppointment() {
  return (
    <AppointmentBookingCalendar
      psychologistId="uuid-here"
      psychologistName="Dr. Amara Adeyemi"
    />
  );
}
```

---

## 🔌 Integration Points

### For Psychologist Pages

**File**: `frontend/src/pages/counselor/CounselorAvailability.tsx`

Replace or enhance existing availability section:
```tsx
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";

export default function CounselorAvailability() {
  return (
    <AppShell items={counselorSidebarItems}>
      {/* Header */}
      <div className="p-8">
        <AvailabilityCalendar />
      </div>
    </AppShell>
  );
}
```

### For Student Pages

**File**: `frontend/src/pages/student/StudentAppointments.tsx`

Add calendar section for booking:
```tsx
import { AppointmentBookingCalendar } from "@/components/AppointmentBookingCalendar";
import { useState } from "react";

export default function StudentAppointments() {
  const [selectedPsychologist, setSelectedPsychologist] = useState(null);

  return (
    <AppShell>
      {selectedPsychologist ? (
        <AppointmentBookingCalendar
          psychologistId={selectedPsychologist.id}
          psychologistName={selectedPsychologist.name}
        />
      ) : (
        <PsychologistSelector onSelect={setSelectedPsychologist} />
      )}
    </AppShell>
  );
}
```

---

## 🎯 Data Flow

### Psychologist Setting Availability
```
AvailabilityCalendar
  ↓ (Click slots)
Selected time slots in state
  ↓ (Save Schedule button)
useSaveSchedule mutation
  ↓ (POST /availability/schedule)
Backend creates PsychologistAvailability records for 4 weeks
  ↓
useMySchedule query refetches
```

### Student Booking Appointment
```
AppointmentBookingCalendar
  ↓ (Click available slot)
Select slot + add notes
  ↓ (Request Appointment button)
useRequestAppointment mutation
  ↓ (POST /appointments/request)
Backend creates Appointment with status="pending"
  ↓
Psychologist sees request in dashboard
  ↓ (Approve/Reject)
useApproveAppointment or useRejectAppointment
  ↓
Status changes to "confirmed" or "rejected"
```

---

## 🧪 Testing the Calendars

### Test Psychologist Flow
1. Login as psychologist
2. Navigate to availability page
3. Click time slots to select (9 AM - 5 PM)
4. Click "Save Schedule (4 weeks)"
5. Verify schedule saved for 4 weeks ahead
6. Add a busy block (e.g., lunch break)
7. Verify busy block appears in calendar

### Test Student Flow
1. Login as student
2. Navigate to "Book Appointment"
3. Select a psychologist from list
4. View their weekly availability
5. Click an available slot (green)
6. Add notes about why you're booking
7. Click "Request Appointment"
8. See confirmation message

### Test Approval Flow
1. Login as psychologist
2. Go to "Pending Requests" or similar
3. View student's appointment request
4. Click Approve or Reject
5. Check that status updates correctly
6. (If approved) Student can now see confirmed appointment

---

## 🎨 Styling & Customization

### Adjusting Time Range
Edit `HOURS` constant in components:
```tsx
// Current: 9 AM - 6 PM
const HOURS = Array.from({ length: 10 }, (_, i) => `${9 + i}:00`);

// Change to 8 AM - 5 PM
const HOURS = Array.from({ length: 9 }, (_, i) => `${8 + i}:00`);
```

### Session Duration
Currently fixed at 1 hour in AppointmentBookingCalendar:
```tsx
const endTime = new Date(timeObj.getTime() + 60 * 60 * 1000); // 1 hour
```

Make it configurable:
```tsx
interface Props {
  psychologistId: string;
  sessionDuration?: number; // in minutes
}
```

### Disable Weekends
Modify `DAYS` or filter week view:
```tsx
const weekDays = DAYS.slice(0, 5); // Mon-Fri only
```

---

## 🔧 Common Customizations

### Add Color Coding
```tsx
// Color slots by therapist
const slotColor = psychologist.availability_type === "premium" ? "bg-blue-500" : "bg-green-500";
```

### Show Time Until Appointment
```tsx
const timeUntil = calculateTimeUntil(appointment.start_time);
<span className="text-xs text-muted-foreground">{timeUntil}</span>
```

### Multi-Therapist Comparison
```tsx
const [selectedTherapists, setSelectedTherapists] = useState([]);

return selectedTherapists.map(therapist => (
  <AppointmentBookingCalendar key={therapist.id} {...therapist} />
));
```

---

## 📋 Remaining Implementation Tasks

- [ ] Integrate AvailabilityCalendar into CounselorAvailability page
- [ ] Integrate AppointmentBookingCalendar into StudentAppointments page
- [ ] Add "Pending Requests" view for psychologists to approve/reject
- [ ] Add timezone support (currently assumes local timezone)
- [ ] Add reminders/notifications for upcoming appointments
- [ ] Add email confirmation when appointment is booked
- [ ] Add calendar export (iCal format)
- [ ] Add recurring availability (beyond 4-week save)

---

## 🐛 Known Limitations

1. **Timezone**: Currently uses browser local timezone
   - Fix: Use `useTimezone` hook to handle multiple timezones

2. **Availability Fetching**: AppointmentBookingCalendar uses mock data
   - Fix: Integrate `useAppointmentAvailability` hook properly

3. **Mobile Responsiveness**: Grid may be too wide on mobile
   - Fix: Add horizontal scroll or switch to list view on mobile

4. **Performance**: Large calendars (many weeks) may be slow
   - Fix: Implement virtual scrolling for long calendars

---

## 📚 Related Files

- Backend availability endpoints: `backend/app/routers/availability.py`
- Backend appointment endpoints: `backend/app/routers/appointments.py`
- Mutation hooks: `frontend/src/hooks/mutations/useAvailabilityMutations.ts`
- Query hooks: `frontend/src/hooks/queries/useAppointments.ts`

---

**Status**: ✅ Components complete and ready for integration  
**Next Steps**: Integrate into existing pages and test workflows
