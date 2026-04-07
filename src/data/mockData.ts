import { Student, Counselor, Appointment, Session, AISummary } from "@/types";

export const mockStudents: Student[] = [
  { id: "s1", name: "Alex Rivera", email: "alex@uni.edu", grade: "Junior (3rd)", avatar: "", wellnessScore: 78, familyContact: { name: "Eleanor Henderson", email: "eleanor@email.com", phone: "(555) 012-3456", relationship: "Mother" } },
  { id: "s2", name: "Marcus Thompson", email: "marcus@uni.edu", grade: "Senior", avatar: "", wellnessScore: 55, familyContact: { name: "Robert Henderson", email: "robert@email.com", phone: "(555) 012-3457", relationship: "Father" } },
  { id: "s3", name: "Sarah Chen", email: "sarah@uni.edu", grade: "Sophomore", avatar: "", wellnessScore: 82, familyContact: { name: "Lisa Chen", email: "lisa@email.com", phone: "(555) 345-6789", relationship: "Mother" } },
  { id: "s4", name: "Alexander Wright", email: "awright@uni.edu", grade: "11th Grade", avatar: "", wellnessScore: 65, familyContact: { name: "David Wright", email: "david@email.com", phone: "(555) 456-7890", relationship: "Father" } },
];

export const mockCounselors: Counselor[] = [
  { id: "c1", name: "Dr. Sarah Jenkins", email: "sjenkins@uni.edu", specialization: "Crisis Intervention Specialist", avatar: "" },
  { id: "c2", name: "Dr. Marcus Vance", email: "mvance@uni.edu", specialization: "Senior Outreach Manager", avatar: "" },
  { id: "c3", name: "Michael Chen", email: "mchen@uni.edu", specialization: "Family Therapy", avatar: "" },
];

export const mockAppointments: Appointment[] = [
  { id: "a1", studentId: "s1", studentName: "Sarah Williams", counselorId: "c1", counselorName: "Dr. Sarah Jenkins", date: "2026-04-08", time: "09:30 AM", type: "Follow-up: Trauma Recovery", status: "confirmed" },
  { id: "a2", studentId: "s2", studentName: "Group Session A", counselorId: "c1", counselorName: "Dr. Sarah Jenkins", date: "2026-04-08", time: "11:00 AM", type: "Anxiety Management Group", status: "confirmed" },
  { id: "a3", studentId: "s3", studentName: "Staff Meeting", counselorId: "c1", counselorName: "Dr. Sarah Jenkins", date: "2026-04-08", time: "01:30 PM", type: "Monthly Protocol Review", status: "pending" },
  { id: "a4", studentId: "s4", studentName: "Alexander Wright", counselorId: "c2", counselorName: "Dr. Marcus Vance", date: "2026-04-10", time: "09:00 AM", type: "Initial Assessment", status: "pending" },
];

export const mockSessions: Session[] = [
  { id: "sess1", studentId: "s3", studentName: "Sarah Chen", counselorId: "c1", counselorName: "Dr. Sarah Jenkins", date: "Oct 24, 2023", time: "09:15 AM", type: "DBT Therapy", status: "completed", duration: "50 min", notes: "Discussed coping strategies for exam anxiety.", moodRating: 3, progressRating: 4, aiSummary: "Student shows improvement in managing anxiety." },
  { id: "sess2", studentId: "s2", studentName: "James Peterson", counselorId: "c1", counselorName: "Dr. Sarah Jenkins", date: "Oct 23, 2023", time: "02:00 PM", type: "Family Counseling", status: "completed", duration: "90 min", notes: "Reviewed progress on sleep hygiene goals.", moodRating: 4, progressRating: 3 },
  { id: "sess3", studentId: "s1", studentName: "Lisa Lotte", counselorId: "c1", counselorName: "Dr. Sarah Jenkins", date: "Oct 22, 2023", time: "11:30 AM", type: "Consultation", status: "cancelled", duration: "-", notes: "" },
  { id: "sess4", studentId: "s4", studentName: "Thomas Wade", counselorId: "c1", counselorName: "Dr. Sarah Jenkins", date: "Oct 21, 2023", time: "04:00 PM", type: "CBT Therapy", status: "completed", duration: "50 min", moodRating: 4, progressRating: 4 },
];

export const mockStudentSessions = [
  { id: "ss1", title: "Weekly Check-in", type: "COMPLETED", counselorName: "Dr. Sarah Chen", date: "October 17, 2023", action: "View Notes", icon: "check" as const },
  { id: "ss2", title: "Intake Evaluation", type: "COMPLETED", counselorName: "Marcus Thorne", date: "October 10, 2023", action: "View Notes", icon: "check" as const },
  { id: "ss3", title: "Urgent Support Call", type: "CRISIS RESPONSE", counselorName: "On-call Counselor Team", date: "October 05, 2023", action: "Resources Provided", icon: "alert" as const },
];

export const mockAISummaries: AISummary[] = [
  { studentId: "s2", studentName: "Marcus Thompson", keyThemes: ["Academic Imposter Syndrome", "Physical Tension (Neck/Shoulders)", "Sleep Cycle Disruption"], riskFlags: ["Crisis Propensity: 68%", "Emotional Regulation: 42%"], recommendations: ["Box Breathing Exercises", "Cognitive Reframing", "20-Minute Focus Blocks"], generatedAt: "2023-10-24T10:30:00Z", sessionTitle: "Post-Exam Stress Analysis", sessionDate: "Oct 24, 2023", quote: "The patient displayed significant somatic symptoms related to academic performance pressure, specifically referencing the upcoming finals as a 'point of no return'.", discourse: "Marcus began the session by detailing a recurring dream about failing his graduation project. This is a significant shift from his previous sessions where social anxiety was the primary driver. He describes a feeling of \"suffocation\" when entering the library, suggesting an environmental trigger that needs further exploration.", recommendedActions: "Schedule follow-up for Tuesday. Monitor the student's usage of the emergency button over the weekend. Encourage Marcus to log his mood peaks before and after study sessions using the mobile portal." },
];

export const mockCrisisAlerts = [
  { id: "cr1", name: "Marcus Henderson", age: "19yrs", level: "SEN 300lvl", description: "AI detected severe withdrawal patterns in digital engagement logs and concerning language in recent journaling session." },
  { id: "cr2", name: "Elena Rodriguez", age: "50yrs", level: "CSC 100lvl", description: "Manual flag by Homeroom Teacher: Physical signs of distress and verbalized self-harm intent during second period." },
];

export const timeSlots = [
  "09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM", "05:30 PM",
];
