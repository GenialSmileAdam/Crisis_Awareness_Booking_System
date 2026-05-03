export const FACULTIES = [
  "Engineering",
  "Medicine",
  "Law",
  "Arts & Social Sciences",
  "Sciences",
  "Business Administration",
];

export const COUNSELORS = ["Dr. Amara Obi", "Dr. Kelechi Eze", "Dr. Bola Adewale"];

export interface Student {
  id: string;
  name: string;
  faculty: string;
  wrs: number;
  lastCheckIn: string;
  counselor: string;
  matric: string;
  email: string;
  classLevel: string;
  lastSeverity: string;
}

const NAMES = [
  "Chidi Okafor", "Amina Bello", "Tunde Adeyemi", "Ngozi Eze", "Emeka Nwosu",
];

const STUDENT_IDS = ["27001011", "27001022", "27001033", "27001044", "27001055"];

function dateDaysAgo(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().split("T")[0];
}

export const STUDENTS: Student[] = NAMES.map((name, i) => ({
  id: STUDENT_IDS[i],
  name,
  faculty: FACULTIES[i % FACULTIES.length],
  wrs: [28, 81, 55, 92, 72][i],
  lastCheckIn: dateDaysAgo(i % 7),
  counselor: COUNSELORS[i % COUNSELORS.length],
  matric: STUDENT_IDS[i],
  email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@nileuni.edu`,
  classLevel: ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level"][i % 5],
  lastSeverity: ["High", "Critical", "Moderate", "Critical", "High"][i % 5],
}));

export type RiskTier = "Green" | "Amber" | "Red" | "Critical";

export const tierFromWrs = (wrs: number): RiskTier =>
  wrs < 40 ? "Green" : wrs <= 65 ? "Amber" : wrs <= 85 ? "Red" : "Critical";

export const colorFromWrs = (wrs: number): string =>
  wrs < 40 ? "#A8FF3E" : wrs <= 65 ? "#FF8C42" : wrs <= 85 ? "#FF4560" : "#B00020";

export const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself or that you are a failure",
  "Trouble concentrating on things",
  "Moving or speaking so slowly, or being fidgety/restless",
  "Thoughts that you would be better off dead or hurting yourself",
];

export const PHQ9_OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half", value: 2 },
  { label: "Nearly every day", value: 3 },
];

export const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
];

export const GAD7_OPTIONS = PHQ9_OPTIONS;

export const PULSE_QUESTIONS = [
  "How is your mood today?",
  "How well did you sleep last night?",
  "How is your energy level?",
  "How connected do you feel to others?",
  "How manageable does your workload feel?",
];

export const RECENT_CHECKINS = [
  { date: dateDaysAgo(0), wrs: 72, type: "PHQ-9" },
  { date: dateDaysAgo(2), wrs: 65, type: "Pulse" },
  { date: dateDaysAgo(4), wrs: 58, type: "GAD-7" },
  { date: dateDaysAgo(7), wrs: 49, type: "Pulse" },
  { date: dateDaysAgo(10), wrs: 42, type: "PHQ-9" },
  { date: dateDaysAgo(13), wrs: 38, type: "Pulse" },
  { date: dateDaysAgo(17), wrs: 45, type: "GAD-7" },
  { date: dateDaysAgo(21), wrs: 51, type: "Pulse" },
];

export const FACULTY_WRS = FACULTIES.map((f) => {
  const ss = STUDENTS.filter((s) => s.faculty === f);
  const avg = ss.length ? Math.round(ss.reduce((a, s) => a + s.wrs, 0) / ss.length) : 0;
  return { faculty: f, avg, count: ss.length };
});

export function trendData(days: number) {
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    wrs: 35 + Math.round(Math.sin(i / 3) * 10 + Math.random() * 12),
    checkins: 20 + Math.round(Math.random() * 30),
  }));
}

export const ALERTS = [
  { studentId: "27001011", faculty: "Engineering", classLevel: "100 Level", wrs: 92, alertTime: "8:00", counselor: "Dr. Amara Obi", status: "Pending" },
  { studentId: "27001022", faculty: "Medicine", classLevel: "200 Level", wrs: 81, alertTime: "9:13", counselor: "Dr. Kelechi Eze", status: "Resolved" },
  { studentId: "27001033", faculty: "Law", classLevel: "300 Level", wrs: 72, alertTime: "10:26", counselor: "Dr. Bola Adewale", status: "Pending" },
  { studentId: "27001044", faculty: "Arts & Social Sciences", classLevel: "400 Level", wrs: 88, alertTime: "11:39", counselor: "Dr. Amara Obi", status: "Resolved" },
  { studentId: "27001055", faculty: "Sciences", classLevel: "500 Level", wrs: 68, alertTime: "12:52", counselor: "Dr. Kelechi Eze", status: "Pending" },
];

export const MOCK_NOTES_VARIANTS = [
  `Patient presents with moderate symptoms of academic burnout consistent with chronic stress exposure. 
  
Key observations:
- Reports sleep disruption (4-5 hrs/night for 3 weeks)
- Withdrawal from extracurricular activities
- Difficulty concentrating during lectures
- Expressions of self-doubt regarding career trajectory

Recommended interventions:
1. Cognitive restructuring exercises
2. Sleep hygiene protocol
3. Weekly check-ins for next 4 weeks
4. Refer to academic advisor for course load review

No active suicidal ideation. Protective factors: strong family support, engaged with faith community.`,
  `Session reveals patient is navigating significant transition stress with adaptive coping strategies emerging.
  
Clinical highlights:
- Acknowledged emotional fatigue from semester demands
- Demonstrates insight into trigger patterns
- Expressed motivation to engage in self-care planning
- Reports modest improvement in mood since last session

Plan:
1. Continue mindfulness practice (10 min/day)
2. Behavioral activation: 2 social outings this week
3. Journaling prompts for emotional regulation
4. Reassess WRS in 7 days

Risk: Low. No safety concerns identified. Patient has clear coping toolkit.`,
];

export function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const UPCOMING_SESSIONS = [
  { id: "SESS-001", studentId: STUDENTS[0].id, studentName: STUDENTS[0].name, classLevel: STUDENTS[0].classLevel, date: new Date().toISOString().split("T")[0], time: "10:00 AM", type: "Initial Consultation", status: "Scheduled", wrs: STUDENTS[0].wrs },
  { id: "SESS-002", studentId: STUDENTS[2].id, studentName: STUDENTS[2].name, classLevel: STUDENTS[2].classLevel, date: new Date().toISOString().split("T")[0], time: "11:30 AM", type: "Follow-up", status: "In Progress", wrs: STUDENTS[2].wrs },
];
