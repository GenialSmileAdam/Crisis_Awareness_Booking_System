import pytest
import uuid
from app.models.users import UserRole
from app.core.security import create_access_token
from tests.test_students import create_test_user, create_test_student

@pytest.mark.anyio
async def test_rbac_boundaries(client, db_session):
    # 1. Create a student to act as target for operations
    target_student_user = await create_test_user(db_session, "target@nileuniversity.edu.ng", UserRole.student, "Target Student")
    target_student = await create_test_student(db_session, target_student_user, "TARGET_STUD")
    
    # Create a psychologist user
    psychologist_user = await create_test_user(db_session, "psychologist@nileuniversity.edu.ng", UserRole.staff, "Clinical Psychologist")
    
    # Create a student user
    student_user = await create_test_user(db_session, "student@nileuniversity.edu.ng", UserRole.student, "Regular Student")
    await db_session.commit()

    # Generate tokens
    psychologist_token = create_access_token(
        user_id=str(psychologist_user.id),
        user_type="staff",
        full_name=psychologist_user.full_name,
        roles=["psychologist"],
        is_admin=False,
        staff_type="psychologist"
    )
    
    student_token = create_access_token(
        user_id=str(student_user.id),
        user_type="student",
        full_name=student_user.full_name,
        roles=["student"],
        is_admin=False
    )

    # ── Test 1: Deactivation endpoint restriction ──
    # Psychologists should be DENIED (403 Forbidden) since they are not admins
    psych_headers = {"Authorization": f"Bearer {psychologist_token}"}
    deact_psych_resp = await client.post(f"/students/{target_student.student_id}/deactivate", headers=psych_headers)
    assert deact_psych_resp.status_code == 403
    assert "Insufficient permissions" in deact_psych_resp.json()["detail"]

    # Students should be DENIED (403 Forbidden)
    student_headers = {"Authorization": f"Bearer {student_token}"}
    deact_stud_resp = await client.post(f"/students/{target_student.student_id}/deactivate", headers=student_headers)
    assert deact_stud_resp.status_code == 403
    assert "Insufficient permissions" in deact_stud_resp.json()["detail"]

    # ── Test 2: Configuration endpoint restriction ──
    # Psychologists should be DENIED access to GET /config/admin
    config_psych_resp = await client.get("/config/admin", headers=psych_headers)
    assert config_psych_resp.status_code == 403
    assert "Insufficient permissions" in config_psych_resp.json()["detail"]

    # Students should be DENIED access to GET /config/admin
    config_stud_resp = await client.get("/config/admin", headers=student_headers)
    assert config_stud_resp.status_code == 403
    assert "Insufficient permissions" in config_stud_resp.json()["detail"]

    # ── Test 3: List students access ──
    # Psychologists SHOULD be allowed to list students (required for managing caseloads)
    list_psych_resp = await client.get("/students", headers=psych_headers)
    assert list_psych_resp.status_code == 200
    assert list_psych_resp.json()["success"] is True

    # Students should be DENIED listing students
    list_stud_resp = await client.get("/students", headers=student_headers)
    assert list_stud_resp.status_code == 403
    assert "Insufficient permissions" in list_stud_resp.json()["detail"]
