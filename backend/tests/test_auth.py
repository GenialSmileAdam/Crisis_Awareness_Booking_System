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
