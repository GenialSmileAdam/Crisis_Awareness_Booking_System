import pytest
import uuid
from sqlalchemy import select
from app.models.users import User, UserRole
from app.models.students import Student
from app.core.security import create_access_token, hash_password

async def create_test_user(db_session, email: str, role: UserRole, full_name: str, is_admin: bool = False, is_active: bool = True):
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password("Password123!"),
        full_name=full_name,
        role=role,
        is_admin=is_admin,
        is_active=is_active
    )
    db_session.add(user)
    await db_session.flush()
    return user

async def create_test_student(db_session, user: User, student_id: str):
    student = Student(
        user_id=user.id,
        student_id=student_id,
        class_level="100",
        crisis_flag=False,
        is_active=True
    )
    db_session.add(student)
    await db_session.flush()
    return student

@pytest.mark.anyio
async def test_admin_deactivate_and_activate_student(client, db_session):
    # 1. Create a student user and student record
    student_user = await create_test_user(db_session, "active_student@nileuniversity.edu.ng", UserRole.student, "Active Student")
    student = await create_test_student(db_session, student_user, "STUD_DEACT")
    await db_session.commit()

    # 2. Create an admin user to perform deactivation
    admin_user = await create_test_user(db_session, "admin_user@nileuniversity.edu.ng", UserRole.staff, "System Admin", is_admin=True)
    await db_session.commit()

    # Generate admin JWT
    admin_token = create_access_token(
        user_id=str(admin_user.id),
        user_type="staff",
        full_name=admin_user.full_name,
        roles=["unit_head"],
        is_admin=True,
        staff_type="administrator"
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Deactivate the student
    deact_resp = await client.post(f"/students/{student.student_id}/deactivate", headers=headers)
    assert deact_resp.status_code == 200
    assert deact_resp.json()["success"] is True
    assert deact_resp.json()["data"]["is_active"] is False

    # Verify student is inactive in database (both records)
    # Refresh student and user from DB
    await db_session.refresh(student)
    await db_session.refresh(student_user)
    assert student.is_active is False
    assert student_user.is_active is False

    # 4. Verify deactivated student is blocked from password login
    login_payload = {
        "username": "active_student@nileuniversity.edu.ng",
        "password": "Password123!"
    }
    login_response = await client.post("/api/auth/login", data=login_payload)
    assert login_response.status_code == 403
    assert "User is inactive" in login_response.json()["detail"]

    # 5. Activate the student again
    act_resp = await client.post(f"/students/{student.student_id}/activate", headers=headers)
    assert act_resp.status_code == 200
    assert act_resp.json()["success"] is True
    assert act_resp.json()["data"]["is_active"] is True

    # Verify student is active again in database (both records)
    await db_session.refresh(student)
    await db_session.refresh(student_user)
    assert student.is_active is True
    assert student_user.is_active is True

    # 6. Verify student can now login successfully
    login_response2 = await client.post("/api/auth/login", data=login_payload)
    assert login_response2.status_code == 200
    assert "access_token" in login_response2.json()


@pytest.mark.anyio
async def test_list_students(client, db_session):
    # Create student and admin
    student_user = await create_test_user(db_session, "list_student@nileuniversity.edu.ng", UserRole.student, "List Student")
    student = await create_test_student(db_session, student_user, "STUD_LIST")
    
    admin_user = await create_test_user(db_session, "admin_list@nileuniversity.edu.ng", UserRole.staff, "Admin List", is_admin=True)
    await db_session.commit()

    admin_token = create_access_token(
        user_id=str(admin_user.id),
        user_type="staff",
        full_name=admin_user.full_name,
        roles=["unit_head"],
        is_admin=True,
        staff_type="administrator"
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # List students
    response = await client.get("/students", headers=headers)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    
    # Check if student is in list
    student_ids = [s["student_id"] for s in res_json["data"]["data"]]
    assert "STUD_LIST" in student_ids
