# Psychologist Dashboard - Real Data Setup

**Date**: 2026-06-07  
**Status**: ✅ All dynamic data from database

---

## 📊 What's Now Dynamic

### ✅ **Removed All Mock Data**
- ~~`trendData(7)` mock function~~ → **Real WRS trend from database**
- All hardcoded fallback data removed
- Dashboard now shows empty state if no real data exists

### ✅ **Real Data Sources**

| Chart/Metric | Source | Endpoint | Real-Time |
|---|---|---|---|
| **WRS Trend** | Risk scores table | `/analytics/real-data` | ✅ Yes |
| **Assessment Volume** | Wellness checkins | `/analytics/real-data` | ✅ Yes |
| **Engagement Rate** | Last 7 days checkins | `/analytics/real-data` | ✅ Yes |
| **Appointment Stats** | Appointments table | `/analytics/real-data` | ✅ Yes |
| **Risk Distribution** | Latest risk scores | `/analytics/real-data` | ✅ Yes |
| **Student Count** | Students table | `/students` endpoint | ✅ Yes |

---

## 🚀 **How to See Real Data**

### Step 1: Seed Test Checkins
```bash
cd backend
python seed_checkins.py
```

**What this does:**
- Creates 7 days of wellness checkins
- 70% of students submit checkins each day
- Mix of PHQ-9, GAD-7, and Pulse assessments
- Random realistic scores

**Expected output:**
```
Found 21 active students
✅ Created 147 wellness checkins for the past 7 days
Dashboard will now show real engagement data!
```

### Step 2: Verify Dashboard Shows Data
1. Login as psychologist
2. Go to **Counselor → Dashboard**
3. Should see:
   - ✅ WRS trend line chart with data points
   - ✅ Assessment volume bars (PHQ-9, GAD-7, Pulse)
   - ✅ Student engagement percentage (not 0%)
   - ✅ Appointment outcomes breakdown

---

## 📈 **Dashboard Data Flow**

### Request Chain
```
CounselorDashboard Component
    ↓
useRealAnalytics(7) hook
    ↓ (GET /analytics/real-data?days=7)
Backend analytics_service.py
    ↓
get_real_chart_data()
    ↓ (Queries database)
Database Tables:
  - RiskScore (WRS trends)
  - WellnessCheckin (assessment volume)
  - Appointment (outcomes)
  - Student (engagement rates)
    ↓
Returns: {
  wrs_trend: [...],
  checkin_volume: [...],
  appointment_stats: {...},
  weekly_engagement: {...},
  ...
}
    ↓
Frontend renders charts with REAL data
```

---

## 🔍 **What Data Gets Calculated**

### **1. WRS Trend (Last 7-30 days)**
```
- Daily average WRS score
- Count of assessments per day
- Shows risk progression over time
- Real data from RiskScore table
```

### **2. Assessment Volume (Last 14 days)**
```
- Daily count by type (PHQ-9, GAD-7, Pulse)
- Shows student engagement patterns
- Stacked bar chart
- Real data from WellnessCheckin table
```

### **3. Weekly Engagement**
```
- % of students who checked in (7 days)
- Count of unique students by assessment type
- Color-coded: Green (50%+), Orange (25%+), Red (<25%)
- Real data from WellnessCheckin table
```

### **4. Appointment Stats (30 days)**
```
- Booked: Future appointments
- Completed: Sessions already happened
- Cancelled: Student/psychologist cancelled
- No-show: Student didn't attend
- Completion rate: Completed / (Completed + Cancelled + No-show)
- Real data from Appointment table
```

### **5. Risk Distribution**
```
- Pie chart: Green, Amber, Red, Critical count
- Latest score per student only (not duplicates)
- Real data from RiskScore table
```

---

## ⚡ **Testing the Dynamic Data**

### Test Scenario 1: Add More Checkins
```bash
python seed_checkins.py
```
Run multiple times to add more data. Dashboard will refresh automatically.

### Test Scenario 2: Check Different Time Ranges
The analytics endpoint accepts `days` parameter:
- `days=7` → Last 7 days
- `days=30` → Last 30 days
- `days=90` → Last 90 days

Frontend uses `useRealAnalytics(7)` for 7-day window.

### Test Scenario 3: Verify No Mock Data
Search codebase for "mock" - should only find in `data/mock.ts` (not in CounselorDashboard):
```bash
grep -n "trendData\|mockData\|fakeData" frontend/src/pages/counselor/CounselorDashboard.tsx
```
Result: Should return no matches (except comments)

---

## 🐛 **Troubleshooting**

### Dashboard shows "No data yet"
**Cause**: No checkins in database for selected time range  
**Fix**: Run `python seed_checkins.py` to create test checkins

### Charts look empty but data exists
**Cause**: Analytics cache not cleared  
**Fix**: Wait 30 minutes (cache TTL) or restart backend

### Engagement shows 0%
**Cause**: No checkins in last 7 days  
**Fix**: Run seed script: `python seed_checkins.py`

### WRS trend shows no line
**Cause**: No risk scores created in time window  
**Fix**: Seed checkins (which trigger risk score calculation)

---

## 📝 **Recent Changes**

```
a2c1c09 Fix: Remove mock data from CounselorDashboard and add checkin seeding
```

**What changed:**
- ✅ Removed `trendData` import (mock function)
- ✅ Removed `const trend = useMemo(() => trendData(7), [])`
- ✅ Updated wrsTrendData fallback: `return []` instead of `return trend`
- ✅ Added `backend/seed_checkins.py` for test data
- ✅ All dashboard now 100% real data

---

## 🔄 **How to Add Real Student Data**

The system already has test students from `seed.py`. To verify:

```bash
# Backend terminal
python seed.py  # Creates ~20 test students
python seed_checkins.py  # Adds checkins for those students
```

Then login as any test psychologist and view real dashboard data.

---

## ✅ **Verification Checklist**

- [x] No hardcoded mock data in CounselorDashboard
- [x] All charts use `analytics` data from backend
- [x] Empty states show when no data (not fallback mock)
- [x] Assessment volume pulls from WellnessCheckin table
- [x] Engagement rate calculates from actual checkins
- [x] Appointment stats from Appointment table
- [x] Risk distribution from RiskScore table
- [x] WRS trend shows real score progression
- [x] Seed script creates realistic test data
- [x] Dashboard auto-refreshes when data is added

---

**Status**: COMPLETE - Dashboard fully dynamic ✅

All data now comes from the database. Run `seed_checkins.py` to populate test data and see the dashboard in action!
