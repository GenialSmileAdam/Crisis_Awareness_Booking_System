# Campus One OIDC Claims Mapping

## Overview

This document maps Campus One's OIDC claims to SafeSpace's user and role system.

## Campus One ID Token Example

```json
{
  "iss": "https://auth.campusone.com.ng",
  "aud": "your-client-id",
  "sub": "user_abc123",
  "email": "256240001@nileuniversity.edu.ng",
  "email_verified": true,
  "name": "Aisha Mohammed",
  "role": "student",
  "roles": ["student", "mentor"],
  "student_id": "256240001",
  "study_level": "undergraduate",
  "level": 300,
  "faculty_id": "fac_eng",
  "department_id": "dept_cs",
  "exp": 1735689600,
  "iat": 1735686000
}
```

## Claims Mapping Table

| Campus One Claim | SafeSpace Field | Usage | Required? |
|------------------|-----------------|-------|-----------|
| `sub` | `User.campus_one_id` | Unique user identifier | ✅ Yes |
| `email` | `User.email` | User email address | ✅ Yes |
| `name` | `User.full_name` | User full name | ❌ No |
| `role` | Determines `User.role` + `User.is_admin` | Primary role (see mapping below) | ✅ Yes |
| `roles` | Staff type detection | Array of all roles (if `roles` scope requested) | ❌ No |
| `custom_roles` | Staff type detection | App-specific roles | ❌ No |
| `student_id` | `Student.student_id` | Student ID (students only) | ✅ For students |
| `study_level` | `Student.program` | Study level (e.g., "undergraduate") | ❌ No |
| `level` | `Student.class_level` | Class level as number (e.g., 100, 200, 300) | ❌ No |
| `faculty_id` | `Student.faculty` | Faculty ID (e.g., "fac_eng") | ❌ No |
| `department_id` | `Student.department` | Department ID (e.g., "dept_cs") | ❌ No |

## Role Mapping

### Primary Role Mapping

Campus One's `role` field values and how they map:

#### Student Role
```
Campus One role: "student"
→ User.role = "student"
→ User.is_admin = false
→ Creates Student record
```

#### Staff Roles

Campus One uses many role values. Here's how they map to SafeSpace staff types:

| Campus One Role | SafeSpace Staff Type | Notes |
|-----------------|---------------------|-------|
| `therapist` | `psychologist` | Direct mapping - therapists are psychologists |
| `staff` + custom role `counselor` | `counselor` | Check custom_roles array |
| `admin` or `administrator` | `administrator` | Sets is_admin=true |
| `mentor` | `support_staff` | Could be counselor depending on your needs |
| Other (`developer`, `employer`, `consultant`, etc.) | `support_staff` | Default fallback |

### Role Detection Algorithm

The system uses this priority order to determine staff_type:

1. **Check if admin**: If `role == "admin"` or `"admin"` in `roles` → `staff_type = "administrator"`, `is_admin = true`
2. **Check if therapist**: If `role == "therapist"` or `"therapist"` in `roles` → `staff_type = "psychologist"`
3. **Check custom roles**: If `"counselor"` in `custom_roles` or `roles` → `staff_type = "counselor"`
4. **Check other staff roles**: Handle mentor, developer, employer, consultant, founder, alumni, auditor
5. **Default**: `staff_type = "support_staff"`

### Example Role Scenarios

**Scenario 1: Psychology Student**
```json
{
  "role": "student",
  "roles": ["student"],
  "student_id": "256240001"
}
```
Result:
- `User.role = "student"`
- `User.is_admin = false`
- `Student` record created with student_id

**Scenario 2: Psychologist/Therapist**
```json
{
  "role": "therapist",
  "roles": ["therapist", "staff"],
  "staff_id": "PSY001"
}
```
Result:
- `User.role = "staff"`
- `User.is_admin = false`
- `Staff` record created with `staff_type = "psychologist"`
- JWT will contain `role = "psychologist"` (via `determine_effective_role`)

**Scenario 3: Counselor with Custom Role**
```json
{
  "role": "staff",
  "roles": ["staff", "counselor"],
  "custom_roles": ["counselor"],
  "staff_id": "CNS001"
}
```
Result:
- `User.role = "staff"`
- `User.is_admin = false`
- `Staff` record created with `staff_type = "counselor"`
- JWT will contain `role = "staff"` (not psychologist)

**Scenario 4: System Administrator**
```json
{
  "role": "admin",
  "roles": ["admin", "staff"],
  "staff_id": "ADM001"
}
```
Result:
- `User.role = "staff"`
- `User.is_admin = true`
- `Staff` record created with `staff_type = "administrator"`
- JWT will contain `role = "admin"` (via `determine_effective_role`)

## OIDC Scopes Required

To get all the necessary claims, request these scopes:

```
openid email profile academic roles notifications offline_access
```

**What each scope provides:**
- `openid` - `sub` (required)
- `email` - `email`, `email_verified`
- `profile` - `name`, `picture`
- `academic` - `student_id`, `study_level`, `level`, `faculty_id`, `department_id`
- `roles` - `roles` array (all roles assigned to user)
- `offline_access` - Refresh token
- `notifications` - Permission to send notifications

## Configuration

### Environment Variables

```bash
CAMPUS_ONE_CLIENT_ID=your-client-id
CAMPUS_ONE_CLIENT_SECRET=your-client-secret
CAMPUS_ONE_WEBHOOK_SECRET=your-webhook-secret
CAMPUS_ONE_ISSUER=https://auth.campusone.com.ng
CAMPUS_ONE_DISCOVERY_URL=https://auth.campusone.com.ng/api/auth/.well-known/openid-configuration
CAMPUS_ONE_JWKS_URL=https://auth.campusone.com.ng/api/auth/jwks
CAMPUS_ONE_SCOPES=openid email profile academic roles notifications offline_access
CAMPUS_ONE_REDIRECT_URI=http://localhost:8000/api/auth/callback  # For local testing
```

For production:
```bash
CAMPUS_ONE_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

### Callback URL Registration

Register your callback URL in Campus One Developer Dashboard:

**Local/Staging:**
- `http://localhost:8000/api/auth/callback`
- `https://staging.your-domain.com/api/auth/callback`

**Production:**
- `https://your-domain.com/api/auth/callback`
- `https://crisis-awareness-booking-system.onrender.com/api/auth/callback` (if using Render)

## Testing the Integration

### Test Case 1: Student Sign-In

1. Create a test student account in Campus One
2. Sign in with that account
3. Verify:
   - Student record is created with correct student_id
   - Faculty and department info is captured
   - JWT contains `role: "student"` and `student_id`

### Test Case 2: Psychologist Sign-In

1. Create a test staff account with `role: "therapist"` in Campus One
2. Sign in with that account
3. Verify:
   - Staff record is created with `staff_type: "psychologist"`
   - JWT contains `role: "psychologist"` and `staff_type: "psychologist"`
   - Can access `/counselor` dashboard

### Test Case 3: Multiple Roles

1. Assign a user multiple roles in Campus One (e.g., "staff" + "counselor")
2. Make sure `roles` scope is requested
3. Verify:
   - System correctly identifies primary role and additional roles
   - Appropriate staff_type is assigned

## Troubleshooting

### Issue: Staff member signs in but Staff record not created

**Cause:** Role not recognized as staff role

**Solution:**
1. Check Campus One user's `role` field
2. Verify `roles` and `custom_roles` claims are included
3. Check backend logs for role detection
4. Ensure campus_one_id matches the user

### Issue: Student can't submit check-ins (422 error)

**Cause:** student_id claim missing from Campus One

**Solution:**
1. Verify `academic` scope is requested
2. Check that student_id is in Campus One claims
3. Verify student_id is being passed to SafeSpace

### Issue: Therapist/Psychologist not identified correctly

**Cause:** Campus One returns different role value than expected

**Solution:**
1. Check what Campus One returns in `role` field
2. Update role mapping in `_determine_user_role_and_type()` if needed
3. Use browser dev tools to inspect JWT claims

## Future Enhancements

1. **Webhook integration** - Listen for `user.disconnected` events from Campus One to auto-logout
2. **Custom roles** - Implement app-specific roles for mentors, supervisors, etc.
3. **Periodic sync** - Refresh user info from Campus One on each request
4. **Role updates** - Auto-update user roles if Campus One role changes

## References

- [Campus One OIDC Documentation](https://docs.campusone.com.ng/sso/oidc)
- [SafeSpace User Roles](./AUTH_ROLES_CONFIGURATION.md)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)
