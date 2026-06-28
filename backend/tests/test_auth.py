import pytest
from sqlalchemy import select
from app.models.users import User, UserRole
from app.models.students import Student
from app.models.password_reset import PasswordResetToken

@pytest.mark.anyio
async def test_student_register_and_login(client, db_session):
    # 1. Register a student
    reg_payload = {
        "email": "teststudent@nileuniversity.edu.ng",
        "password": "StudentPassword123!",
        "full_name": "Test Student",
        "user_type": "student",
        "student_id": "STUD0099",
        "class_level": "100",
        "guidance_counselor": "Dr. Counselor",
        "emergency_contact": "Parent Name",
        "emergency_phone": "08012345678"
    }
    
    response = await client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["email"] == "teststudent@nileuniversity.edu.ng"
    assert res_data["data"]["student_id"] == "STUD0099"

    # Verify user exists in database
    user_stmt = select(User).where(User.email == "teststudent@nileuniversity.edu.ng")
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one_or_none()
    assert db_user is not None
    assert db_user.role == UserRole.student

    # Verify student record exists in database
    student_stmt = select(Student).where(Student.student_id == "STUD0099")
    student_res = await db_session.execute(student_stmt)
    db_student = student_res.scalar_one_or_none()
    assert db_student is not None
    assert db_student.user_id == db_user.id

    # 2. Login as the newly created student
    login_payload = {
        "username": "teststudent@nileuniversity.edu.ng",
        "password": "StudentPassword123!"
    }
    # Form data request (x-www-form-urlencoded) for OAuth2PasswordRequestForm
    login_response = await client.post(
        "/api/auth/login",
        data=login_payload
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"

    # Verify refresh token cookie is set
    assert "refresh_token" in login_response.cookies
    refresh_token_val = login_response.cookies["refresh_token"]
    assert refresh_token_val is not None

    # 3. Try to login with incorrect credentials
    bad_login_response = await client.post(
        "/api/auth/login",
        data={"username": "teststudent@nileuniversity.edu.ng", "password": "WrongPassword"}
    )
    assert bad_login_response.status_code == 401
    assert "Invalid email or password" in bad_login_response.json()["detail"]


@pytest.mark.anyio
async def test_token_refresh(client, db_session):
    # Register and login a student to get a refresh token
    reg_payload = {
        "email": "testrefresh@nileuniversity.edu.ng",
        "password": "RefreshPassword123!",
        "full_name": "Test Refresh Student",
        "user_type": "student",
        "student_id": "STUD0088",
    }
    await client.post("/api/auth/register", json=reg_payload)

    login_response = await client.post(
        "/api/auth/login",
        data={"username": "testrefresh@nileuniversity.edu.ng", "password": "RefreshPassword123!"}
    )
    assert login_response.status_code == 200
    old_access_token = login_response.json()["access_token"]
    
    # Refresh the token using the refresh_token cookie
    client.cookies.update(login_response.cookies)
    refresh_response = await client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200
    refresh_data = refresh_response.json()
    assert "access_token" in refresh_data
    assert refresh_data["access_token"] != old_access_token

    # Verify new refresh token cookie was written (rotation)
    assert "refresh_token" in refresh_response.cookies
    assert refresh_response.cookies["refresh_token"] != login_response.cookies["refresh_token"]


@pytest.mark.anyio
async def test_password_reset_flow(client, db_session):
    # Register student
    reg_payload = {
        "email": "resettest@nileuniversity.edu.ng",
        "password": "OldPassword1!",
        "full_name": "Reset Test User",
        "user_type": "student",
        "student_id": "STUD0077",
    }
    await client.post("/api/auth/register", json=reg_payload)

    # 1. Request password reset
    reset_req_response = await client.post(
        "/api/auth/request-password-reset",
        json={"email": "resettest@nileuniversity.edu.ng"}
    )
    assert reset_req_response.status_code == 200
    assert reset_req_response.json()["success"] is True

    # 2. Retrieve token from database
    user_stmt = select(User).where(User.email == "resettest@nileuniversity.edu.ng")
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one()

    token_stmt = select(PasswordResetToken).where(
        PasswordResetToken.user_id == db_user.id
    ).order_by(PasswordResetToken.created_at.desc())
    token_res = await db_session.execute(token_stmt)
    db_token = token_res.scalar_one_or_none()
    assert db_token is not None
    assert db_token.used_at is None

    # 3. Reset password using the token
    reset_response = await client.post(
        "/api/auth/reset-password",
        json={
            "token": db_token.token,
            "new_password": "NewPassword2!"
        }
    )
    assert reset_response.status_code == 200
    assert reset_response.json()["success"] is True

    # 4. Try logging in with the old password (should fail)
    old_login_resp = await client.post(
        "/api/auth/login",
        data={"username": "resettest@nileuniversity.edu.ng", "password": "OldPassword1!"}
    )
    assert old_login_resp.status_code == 401

    # 5. Login with new password (should succeed)
    new_login_resp = await client.post(
        "/api/auth/login",
        data={"username": "resettest@nileuniversity.edu.ng", "password": "NewPassword2!"}
    )
    assert new_login_resp.status_code == 200
    assert "access_token" in new_login_resp.json()


@pytest.mark.anyio
async def test_jwt_auto_provisioning(client, db_session):
    import uuid
    from app.core.security import create_access_token
    from app.models.users import User
    from sqlalchemy import select

    # Generate a random UUID for a user that does not exist in the database
    new_user_id = str(uuid.uuid4())
    token = create_access_token(
        user_id=new_user_id,
        user_type="student",
        full_name="Auto Provisioned JWT User",
        roles=["student"],
        student_id="STUD_AUTO_99",
        email="autoprovision@nileuniversity.edu.ng",
    )

    # Make request to an authenticated endpoint (/auth/me) with this JWT
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["name"] == "Auto Provisioned JWT User"

    # Verify that the user was auto-created in the database
    user_stmt = select(User).where(User.id == uuid.UUID(new_user_id))
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one_or_none()
    assert db_user is not None
    assert db_user.email == "autoprovision@nileuniversity.edu.ng"
    assert db_user.full_name == "Auto Provisioned JWT User"
    assert db_user.role == UserRole.student


@pytest.mark.anyio
async def test_jwt_auto_provisioning_staff(client, db_session):
    import uuid
    from app.core.security import create_access_token
    from app.models.users import User
    from app.models.staff import Staff
    from sqlalchemy import select

    # Generate a random UUID for a staff user that does not exist in the database
    new_user_id = str(uuid.uuid4())
    token = create_access_token(
        user_id=new_user_id,
        user_type="staff",
        full_name="Auto Provisioned JWT Staff",
        roles=["staff", "psychologist"],
        staff_type="psychologist",
        staff_id="STAFF_AUTO_99",
        email="autoprovisionstaff@nileuniversity.edu.ng",
    )

    # Make request to an authenticated endpoint (/auth/me) with this JWT
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["name"] == "Auto Provisioned JWT Staff"

    # Verify that the user was auto-created in the database
    user_stmt = select(User).where(User.id == uuid.UUID(new_user_id))
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one_or_none()
    assert db_user is not None
    assert db_user.email == "autoprovisionstaff@nileuniversity.edu.ng"
    assert db_user.role == UserRole.staff

    # Verify that the staff record was auto-created in the database
    staff_stmt = select(Staff).where(Staff.user_id == uuid.UUID(new_user_id))
    staff_res = await db_session.execute(staff_stmt)
    db_staff = staff_res.scalar_one_or_none()
    assert db_staff is not None
    assert db_staff.staff_id == "STAFF_AUTO_99"
    assert db_staff.staff_type.value == "psychologist"


@pytest.mark.anyio
async def test_jwt_auto_provisioning_admin(client, db_session):
    import uuid
    from app.core.security import create_access_token
    from app.models.users import User
    from app.models.staff import Staff
    from sqlalchemy import select

    # Generate a random UUID for an admin user that does not exist in the database
    new_user_id = str(uuid.uuid4())
    token = create_access_token(
        user_id=new_user_id,
        user_type="staff",
        full_name="Auto Provisioned JWT Admin",
        roles=["staff", "unit_head"],
        is_admin=True,
        staff_type="administrator",
        staff_id="ADMIN_AUTO_99",
        email="autoprovisionadmin@nileuniversity.edu.ng",
    )

    # Make request to an authenticated endpoint (/auth/me) with this JWT
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["name"] == "Auto Provisioned JWT Admin"

    # Verify that the user was auto-created in the database
    user_stmt = select(User).where(User.id == uuid.UUID(new_user_id))
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one_or_none()
    assert db_user is not None
    assert db_user.email == "autoprovisionadmin@nileuniversity.edu.ng"
    assert db_user.role == UserRole.staff
    assert db_user.is_admin is True

    # Verify that the staff record was auto-created in the database
    staff_stmt = select(Staff).where(Staff.user_id == uuid.UUID(new_user_id))
    staff_res = await db_session.execute(staff_stmt)
    db_staff = staff_res.scalar_one_or_none()
    assert db_staff is not None
    assert db_staff.staff_id == "ADMIN_AUTO_99"
    assert db_staff.staff_type.value == "administrator"


@pytest.mark.anyio
async def test_jwt_auto_provisioning_collisions(client, db_session):
    import uuid
    from app.core.security import create_access_token
    from app.models.users import User
    from app.models.students import Student
    from sqlalchemy import select

    # 1. Create a user with student_id = STUD_COLLIDE
    new_user_id_1 = str(uuid.uuid4())
    token_1 = create_access_token(
        user_id=new_user_id_1,
        user_type="student",
        full_name="User One",
        roles=["student"],
        student_id="STUD_COLLIDE",
        email="userone@nileuniversity.edu.ng",
    )
    headers_1 = {"Authorization": f"Bearer {token_1}"}
    response_1 = await client.get("/auth/me", headers=headers_1)
    assert response_1.status_code == 200

    # 2. Create another user with the SAME student_id = STUD_COLLIDE
    new_user_id_2 = str(uuid.uuid4())
    token_2 = create_access_token(
        user_id=new_user_id_2,
        user_type="student",
        full_name="User Two",
        roles=["student"],
        student_id="STUD_COLLIDE",
        email="usertwo@nileuniversity.edu.ng",
    )
    headers_2 = {"Authorization": f"Bearer {token_2}"}
    response_2 = await client.get("/auth/me", headers=headers_2)
    assert response_2.status_code == 200

    # Verify student records: first should have STUD_COLLIDE, second should have STUD_COLLIDE_1
    student_1_stmt = select(Student).where(Student.user_id == uuid.UUID(new_user_id_1))
    student_1_res = await db_session.execute(student_1_stmt)
    student_1 = student_1_res.scalar_one()
    assert student_1.student_id == "STUD_COLLIDE"

    student_2_stmt = select(Student).where(Student.user_id == uuid.UUID(new_user_id_2))
    student_2_res = await db_session.execute(student_2_stmt)
    student_2 = student_2_res.scalar_one()
    assert student_2.student_id == "STUD_COLLIDE_1"


@pytest.mark.anyio
async def test_oidc_exchange_and_healing(client, db_session):
    import uuid
    from unittest.mock import patch, AsyncMock
    from app.models.users import User, UserRole
    from app.models.students import Student
    from sqlalchemy import select

    # Mock CampusOneOIDC
    mock_exchange = AsyncMock(return_value={
        "id_token": "fake_id_token",
        "access_token": "fake_access_token",
        "refresh_token": "fake_refresh_token"
    })
    
    mock_verify = AsyncMock(return_value={
        "sub": "c1_user_healed_student",
        "email": "healed_student@nileuniversity.edu.ng",
        "name": "Healed Student",
        "role": "student",
        "roles": ["student"],
        "student_id": "ST_HEALED_01",
        "level": 300,
        "faculty_id": "fac_eng",
        "department_id": "dept_cs"
    })

    with patch("app.routers.auth.CampusOneOIDC") as MockOIDC:
        instance = MockOIDC.return_value
        instance.exchange_code_for_tokens = mock_exchange
        instance.verify_and_decode_id_token = mock_verify

        # 1. Test OIDC exchange for a new user (creates User and Student records)
        exchange_payload = {
            "code": "test_code",
            "state": "test_state",
            "code_verifier": "test_verifier"
        }
        response = await client.post("/api/auth/exchange", json=exchange_payload)
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["success"] is True
        assert "token" in res_data["data"]

        # Verify refresh token cookie is set
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"] is not None

        # Verify Student record was created
        student_stmt = select(Student).where(Student.student_id == "ST_HEALED_01")
        student_res = await db_session.execute(student_stmt)
        db_student = student_res.scalar_one_or_none()
        assert db_student is not None
        assert db_student.class_level == "300"
        assert db_student.faculty == "fac_eng"

        # 2. Test OIDC exchange for an existing user who is missing their Student record (Self-healing)
        # We manually delete the student record from DB first
        from sqlalchemy import delete
        await db_session.execute(delete(Student).where(Student.student_id == "ST_HEALED_01"))
        await db_session.commit()

        # Verify Student record is gone
        student_res = await db_session.execute(student_stmt)
        assert student_res.scalar_one_or_none() is None

        # Call exchange again (which matches existing user but triggers update_user_from_claims and heals the Student record)
        response2 = await client.post("/api/auth/exchange", json=exchange_payload)
        assert response2.status_code == 200
        
        # Verify Student record was auto-provisioned/healed
        db_session.expire_all()
        student_res2 = await db_session.execute(student_stmt)
        db_student2 = student_res2.scalar_one_or_none()
        assert db_student2 is not None
        assert db_student2.student_id == "ST_HEALED_01"




