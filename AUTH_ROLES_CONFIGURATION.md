# Authentication & Roles Configuration Guide

## Current Issues Identified

### 1. **OIDC Sign-in Flow Problems**

#### Issue A: Auto-redirect Loop
**Location:** `frontend/src/pages/Login.tsx` lines 91-95

```typescript
useEffect(() => {
  if (!isAuthenticated && !showFallback) {
    window.location.href = `${API_URL}/auth/campus-one/authorize`;
  }
}, [isAuthenticated, showFallback, API_URL]);
```

**Problem:** The login page ALWAYS redirects to Campus One OIDC if not authenticated. This creates the confusing flow:
1. User visits `/login` 
2. Auto-redirects to Campus One
3. Returns from Campus One with callback
4. Redirects to dashboard OR back to login
5. If not fully authenticated, back to step 2 (loop)

**Solution:** Make OIDC optional with a fallback to email/password login, or remove this auto-redirect and let user click a button.

---

### 2. **Role Configuration Issues**

#### The Role System (Current Design)

The system has a **three-tier role hierarchy**:

```
User.role (database)
├── "student" 
│   └── No staff_type (Student model only)
└── "staff"
    ├── staff_type: "psychologist" ← Maps to "psychologist" role in JWT
    ├── staff_type: "counselor" ← Remains "staff" in JWT
    ├── staff_type: "administrator" ← Only if is_admin=true → "admin" in JWT
    └── staff_type: "support_staff" ← Remains "staff" in JWT
```

#### JWT Role Values (Determined by `determine_effective_role()`)
- **"admin"** — Only if `is_admin=true`
- **"psychologist"** — Only if `user_type="staff"` AND `staff_type="psychologist"`
- **"student"** — If `user_type="student"`
- **"staff"** — If `user_type="staff"` but NOT psychologist and NOT admin

---

### 3. **Campus One OIDC Integration - Missing Staff Role Mapping**

#### Problem
When a new user is created from Campus One OIDC (`backend/app/services/campus_one_service.py` lines 43-76):

```python
# Current code - INCOMPLETE
if role_str == "student":
    role = UserRole.student
else:
    role = UserRole.staff  # ← Created as staff, but NO Staff record!
```

**The issue:**
- Students get a `Student` record created automatically ✅
- Staff users do NOT get a `Staff` record created ❌
- Without a Staff record, staff have no `staff_type`
- Without `staff_type`, they can't be identified as "psychologist", "counselor", etc.

#### What Campus One Should Provide
Campus One needs to return these claims:

```json
{
  "sub": "campus_one_id",
  "email": "user@example.com",
  "name": "Full Name",
  "role": "student" | "staff",
  "student_id": "STU123456789",  // For students
  "staff_id": "PSY001",           // For staff
  "staff_type": "psychologist",   // Options: psychologist, counselor, administrator, support_staff
  "faculty": "...",
  "department_id": "...",
  "level": "...",
  "year_of_study": "..."
}
```

---

### 4. **Check-in Submission Failures (401 & 422 errors)**

#### Error 401 (Unauthorized)
**Cause:** Could be:
- Token expired/invalid
- Missing Authorization header
- Token not being sent in requests

**Check:** 
- Is the refresh token cookie being set? (`Set-Cookie: refresh_token=...`)
- Are API requests including `Authorization: Bearer <token>`?

#### Error 422 (Unprocessable Entity)
**Cause:** The `/checkins/submit` endpoint has validation issues:

```python
@router.post("/submit")
async def submit_test(
    data: TestSubmission,
    current_user: User = Depends(get_current_user)  # ← Receives dict
):
    checkin = WellnessCheckin(
        student_id=data.student_id,  # ← No validation!
        # ...
    )
```

**The problem:**
- `student_id` is provided by the client without validation
- No check that `current_user` is actually the student submitting
- Should be: `student_id = current_user.get("student_id")` (read from JWT, not request)

---

## What You Need to Configure

### Step 1: Fix Campus One Claims Mapping

**File:** `backend/app/services/campus_one_service.py`

**Current Code (Lines 43-76) - INCOMPLETE:**
```python
role = UserRole.student if role_str == "student" else UserRole.staff
is_admin = role_str == "admin"

new_user = User(...)
```

**Should Be:**
```python
# Determine user role
role = UserRole.student if role_str == "student" else UserRole.staff
is_admin = role_str == "admin"

new_user = User(
    id=uuid.uuid4(),
    campus_one_id=campus_one_id,
    email=email,
    full_name=full_name,
    password_hash=hash_password(""),
    role=role,
    is_admin=is_admin,
    is_active=True,
)

db.add(new_user)
await db.flush()

# ✅ CREATE Staff RECORD FOR ALL STAFF USERS
if role == UserRole.staff:
    from app.models.staff import Staff, StaffType
    
    staff_type_str = claims.get("staff_type", "support_staff")
    try:
        staff_type = StaffType(staff_type_str)
    except ValueError:
        staff_type = StaffType.support_staff  # Fallback
    
    staff = Staff(
        user_id=new_user.id,
        staff_id=claims.get("staff_id", f"st_{campus_one_id[:12]}"),
        staff_type=staff_type,
        department=claims.get("department"),
        specialization=claims.get("specialization"),
    )
    db.add(staff)

# ✅ CREATE Student RECORD FOR STUDENTS
elif role == UserRole.student:
    student_id = claims.get("student_id", f"c1_{campus_one_id[:12]}")
    student = Student(
        student_id=student_id,
        user_id=new_user.id,
        faculty=claims.get("faculty"),
        department=claims.get("department_id"),
        class_level=claims.get("level"),
        year_of_study=claims.get("year_of_study"),
        program=claims.get("programme"),
    )
    db.add(student)

await db.commit()
```

---

### Step 2: Configure Campus One to Return Correct Claims

**What to request from Campus One:**

When setting up your OIDC integration, configure Campus One to include these scopes and claims:

```
scope: openid profile email
claims: {
  "student_id": "STU123456789",
  "staff_id": "PSY001",
  "staff_type": "psychologist",  // Must be one of: psychologist, counselor, administrator, support_staff
  "faculty": "Faculty of Science",
  "department_id": "CS",
  "level": "100",
  "year_of_study": "1",
  "programme": "Computer Science"
}
```

---

### Step 3: Fix Check-in Submission Endpoint

**File:** `backend/app/routers/checkins.py`

**Change Line 15-56 from:**
```python
@router.post("/submit", response_model=TestResultResponse)
async def submit_test(
    data: TestSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checkin = WellnessCheckin(
        student_id=data.student_id,  # ← WRONG: trusts client
        # ...
    )
```

**To:**
```python
@router.post("/submit", response_model=TestResultResponse)
async def submit_test(
    data: TestSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)  # ← Current_user is a dict
):
    # ✅ Verify current user is a student
    if current_user.get("user_type") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit check-ins")
    
    # ✅ Use student_id from JWT (not from request)
    student_id = current_user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID not found in token")
    
    # ✅ Verify student_id matches request (optional but recommended)
    if data.student_id != student_id:
        raise HTTPException(status_code=403, detail="Cannot submit for another student")
    
    checkin = WellnessCheckin(
        student_id=student_id,  # ← Now from JWT
        type=data.test_type,
        responses=data.responses,
        score=data.score,
    )
    # ... rest of code
```

---

### Step 4: Fix Permission Checks

**File:** `backend/app/routers/checkins.py` Line 68

**Current (BROKEN):**
```python
if current_user["role"] not in ("admin", "psychologist") and current_user.get("student_id") != student_id:
```

**Problem:** `current_user["role"]` could be:
- "admin" ✅
- "psychologist" ✅
- "student" ✅
- "staff" ❌ (This is a staff member who is NOT a psychologist!)

**Should be:**
```python
# Check if user is admin or psychologist
is_authorized = (
    current_user.get("is_admin") or 
    current_user.get("staff_type") == "psychologist"
)

# OR if they're the student themselves
is_self = current_user.get("user_type") == "student" and current_user.get("student_id") == student_id

if not (is_authorized or is_self):
    raise HTTPException(status_code=403, detail="Insufficient permissions")
```

---

## Summary: Required Roles for Each Feature

| Feature | Required Role | JWT Field | Condition |
|---------|---------------|-----------|-----------|
| Student Dashboard | `student` | `user_type=="student"` | Always |
| Submit Check-in | `student` | `user_type=="student"` | Always |
| View Own Check-ins | `student` | `user_type=="student"` | Always |
| View Any Check-ins | `psychologist` | `staff_type=="psychologist"` | Must have Staff record |
| Manage Appointments | `psychologist` | `staff_type=="psychologist"` | Must have Staff record |
| Admin Panel | `admin` | `is_admin==true` | Must be flagged in Campus One |
| Counselor Dashboard | `psychologist` | `staff_type=="psychologist"` | Must have Staff record |

---

## Testing the Auth Flow

### Test Case 1: Student Login
```
Campus One Claims:
{
  "sub": "c1_test_001",
  "email": "student@test.edu",
  "name": "Test Student",
  "role": "student",
  "student_id": "STU123456789"
}

Expected Result:
- User created with role="student"
- Student record created
- JWT contains: role="student", student_id="STU123456789"
- Can access: /student, /checkins/submit
- Cannot access: /counselor, /admin
```

### Test Case 2: Psychologist Login
```
Campus One Claims:
{
  "sub": "c1_test_002",
  "email": "psych@test.edu",
  "name": "Dr. Test Psychologist",
  "role": "staff",
  "staff_id": "PSY001",
  "staff_type": "psychologist"
}

Expected Result:
- User created with role="staff"
- Staff record created with staff_type="psychologist"
- JWT contains: role="psychologist", staff_type="psychologist", staff_id="PSY001"
- Can access: /counselor, /checkins/student/{id}
- Cannot access: /student (different path), /admin (unless is_admin=true)
```

### Test Case 3: Admin Login
```
Campus One Claims:
{
  "sub": "c1_test_003",
  "email": "admin@test.edu",
  "name": "Admin User",
  "role": "admin",
  "is_admin": true
}

Expected Result:
- User created with role="staff", is_admin=true
- JWT contains: role="admin", is_admin=true
- Can access: /admin, all endpoints
```

---

## Next Steps

1. **Contact Campus One team** to configure OIDC claims correctly
2. **Implement Step 1** (Staff record creation in OIDC callback)
3. **Implement Step 2** (Campus One claims configuration)
4. **Implement Steps 3-4** (Fix endpoints)
5. **Test with test users** for each role
6. **Update frontend** to handle different roles properly
