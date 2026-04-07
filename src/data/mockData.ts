import { Student, Counselor, Appointment, Session, AISummary } from "@/types";

export const mockStudents: Student[] = [
  { id: "s1", name: "Alex Johnson", email: "alex@uni.edu", grade: "Junior", avatar: "", wellnessScore: 78, familyContact: { name: "Maria Johnson", email: "maria@email.com", phone: "(555) 123-4567", relationship: "Mother" } },
  { id: "s2", name: "Sam Rivera", email: "sam@uni.edu", grade: "Sophomore", avatar: "", wellnessScore: 65, familyContact: { name: "Carlos Rivera", email: "carlos@email.com", phone: "(555) 234-5678", relationship: "Father" } },
  { id: "s3", name: "Jordan Lee", email: "jordan@uni.edu", grade: "Senior", avatar: "", wellnessScore: 82, familyContact: { name: "Lisa Lee", email: "lisa@email.com", phone: "(555) 345-6789", relationship: "Mother" } },
  { id: "s4", name: "Taylor Kim", email: "taylor@uni.edu", grade: "Freshman", avatar: "", wellnessScore: 55, familyContact: { name: "David Kim", email: "david@email.com", phone: "(555) 456-7890", relationship: "Father" } },
];

export const mockCounselors: Counselor[] = [
  { id: "c1", name: "Dr. Emily Carter", email: "ecarter@uni.edu", specialization: "Anxiety & Stress", avatar: "" },
  { id: "c2", name: "Dr. Michael Brown", email: "mbrown@uni.edu", specialization: "Academic Counseling", avatar: "" },
  { id: "c3", name: "Dr. Sarah Davis", email: "sdavis@uni.edu", specialization: "Family Therapy", avatar: "" },
];

export const mockAppointments: Appointment[] = [
  { id: "a1", studentId: "s1", studentName: "Alex Johnson", counselorId: "c1", counselorName: "Dr. Emily Carter", date: "2026-04-08", time: "10:00 AM", type: "Individual", status: "confirmed" },
  { id: "a2", studentId: "s2", studentName: "Sam Rivera", counselorId: "c1", counselorName: "Dr. Emily Carter", date: "2026-04-08", time: "11:30 AM", type: "Follow-up", status: "pending" },
  { id: "a3", studentId: "s3", studentName: "Jordan Lee", counselorId: "c2", counselorName: "Dr. Michael Brown", date: "2026-04-09", time: "2:00 PM", type: "Group", status: "confirmed" },
  { id: "a4", studentId: "s4", studentName: "Taylor Kim", counselorId: "c3", counselorName: "Dr. Sarah Davis", date: "2026-04-10", time: "9:00 AM", type: "Initial Assessment", status: "pending" },
];

export const mockSessions: Session[] = [
  { id: "sess1", studentId: "s1", studentName: "Alex Johnson", counselorId: "c1", counselorName: "Dr. Emily Carter", date: "2026-03-25", type: "Individual", status: "completed", notes: "Discussed coping strategies for exam anxiety.", moodRating: 3, progressRating: 4, aiSummary: "Student shows improvement in managing anxiety through breathing techniques." },
  { id: "sess2", studentId: "s1", studentName: "Alex Johnson", counselorId: "c1", counselorName: "Dr. Emily Carter", date: "2026-03-18", type: "Follow-up", status: "completed", notes: "Reviewed progress on sleep hygiene goals.", moodRating: 4, progressRating: 3 },
  { id: "sess3", studentId: "s2", studentName: "Sam Rivera", counselorId: "c2", counselorName: "Dr. Michael Brown", date: "2026-03-20", type: "Individual", status: "completed", notes: "Explored academic motivation challenges.", moodRating: 2, progressRating: 2 },
  { id: "sess4", studentId: "s3", studentName: "Jordan Lee", counselorId: "c2", counselorName: "Dr. Michael Brown", date: "2026-04-01", type: "Group", status: "completed", moodRating: 4, progressRating: 4 },
  { id: "sess5", studentId: "s4", studentName: "Taylor Kim", counselorId: "c3", counselorName: "Dr. Sarah Davis", date: "2026-04-03", type: "Initial Assessment", status: "pending", moodRating: 2, progressRating: 1 },
];

export const mockAISummaries: AISummary[] = [
  { studentId: "s1", studentName: "Alex Johnson", keyThemes: ["Exam anxiety", "Sleep issues", "Social adjustment"], riskFlags: ["Mild anxiety symptoms"], recommendations: ["Continue CBT techniques", "Weekly check-ins", "Refer to study skills workshop"], generatedAt: "2026-04-05T10:30:00Z" },
  { studentId: "s2", studentName: "Sam Rivera", keyThemes: ["Academic motivation", "Family pressure", "Identity exploration"], riskFlags: ["Declining academic performance", "Social withdrawal"], recommendations: ["Increase session frequency", "Connect with academic advisor", "Explore peer support groups"], generatedAt: "2026-04-04T14:15:00Z" },
];

export const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM",
];
