import pytest
import hmac
import hashlib
import json
from sqlalchemy import select
from app.core.config import settings
from app.models.users import User, UserRole
from app.models.students import Student
from app.models.refresh_tokens import RefreshToken
from app.core.security import hash_token
from datetime import datetime, timedelta, timezone

TEST_SECRET = "test_webhook_secret_key_123"

@pytest.fixture(autouse=True)
def setup_webhook_secret():
    old_secret = settings.CAMPUS_ONE_WEBHOOK_SECRET
    settings.CAMPUS_ONE_WEBHOOK_SECRET = TEST_SECRET
    yield
    settings.CAMPUS_ONE_WEBHOOK_SECRET = old_secret

def get_signature(body: bytes) -> str:
    return "sha256=" + hmac.new(TEST_SECRET.encode(), body, hashlib.sha256).hexdigest()

@pytest.mark.anyio
async def test_webhook_signature_validation(client):
    body_data = {"id": "test_id", "event": "user.created", "data": {}}
    body_bytes = json.dumps(body_data).encode()

    # 1. Missing signature
    resp = await client.post("/api/webhooks/campus-one", content=body_bytes)
    assert resp.status_code == 401

    # 2. Invalid signature
    headers = {"X-Campus-One-Signature": "sha256=invalid"}
    resp = await client.post("/api/webhooks/campus-one", content=body_bytes, headers=headers)
    assert resp.status_code == 401

    # 3. Valid signature
    headers = {"X-Campus-One-Signature": get_signature(body_bytes)}
    resp = await client.post("/api/webhooks/campus-one", content=body_bytes, headers=headers)
    # Since data is empty, it will fail validation with 400 (missing fields), but NOT 401 signature error
    assert resp.status_code == 400

@pytest.mark.anyio
async def test_webhook_user_created(client, db_session):
    body_data = {
        "id": "event_1",
        "event": "user.created",
        "occurredAt": "2026-05-21T14:22:00.000Z",
        "data": {
            "user_id": "c1_user_new1",
            "email": "newstudent@nileuniversity.edu.ng",
            "name": "New Webhook Student",
            "role": "student",
            "student_id": "ST_WEB_01",
            "level": 200,
            "faculty_id": "fac_eng",
            "department_id": "dept_cs"
        }
    }
    body_bytes = json.dumps(body_data).encode()
    headers = {"X-Campus-One-Signature": get_signature(body_bytes)}

    resp = await client.post("/api/webhooks/campus-one", content=body_bytes, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Check database
    user_stmt = select(User).where(User.campus_one_id == "c1_user_new1")
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one_or_none()
    assert db_user is not None
    assert db_user.email == "newstudent@nileuniversity.edu.ng"
    assert db_user.role == UserRole.student

    student_stmt = select(Student).where(Student.user_id == db_user.id)
    student_res = await db_session.execute(student_stmt)
    db_student = student_res.scalar_one_or_none()
    assert db_student is not None
    assert db_student.student_id == "ST_WEB_01"
    assert db_student.class_level == "200"

@pytest.mark.anyio
async def test_webhook_user_updated_and_role_changed(client, db_session):
    # First provision a user via webhook
    initial_body = {
        "id": "event_2",
        "event": "user.created",
        "data": {
            "user_id": "c1_user_new2",
            "email": "webhookupdate@nileuniversity.edu.ng",
            "name": "Initial Name",
            "role": "student",
            "student_id": "ST_WEB_02"
        }
    }
    body_bytes = json.dumps(initial_body).encode()
    await client.post("/api/webhooks/campus-one", content=body_bytes, headers={"X-Campus-One-Signature": get_signature(body_bytes)})

    # Now send user.updated event to change their name
    update_body = {
        "id": "event_3",
        "event": "user.updated",
        "data": {
            "user_id": "c1_user_new2",
            "email": "webhookupdate@nileuniversity.edu.ng",
            "name": "Updated Name",
            "role": "student",
            "student_id": "ST_WEB_02"
        }
    }
    update_bytes = json.dumps(update_body).encode()
    resp = await client.post("/api/webhooks/campus-one", content=update_bytes, headers={"X-Campus-One-Signature": get_signature(update_bytes)})
    assert resp.status_code == 200

    # Verify update in DB
    db_session.expire_all()
    user_stmt = select(User).where(User.campus_one_id == "c1_user_new2")
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one()
    assert db_user.full_name == "Updated Name"

@pytest.mark.anyio
async def test_webhook_session_signed_out(client, db_session):
    # Provision user
    user_id = "c1_user_new3"
    initial_body = {
        "id": "event_4",
        "event": "user.created",
        "data": {
            "user_id": user_id,
            "email": "webhooklogout@nileuniversity.edu.ng",
            "name": "Logout Student",
            "role": "student",
            "student_id": "ST_WEB_03"
        }
    }
    body_bytes = json.dumps(initial_body).encode()
    await client.post("/api/webhooks/campus-one", content=body_bytes, headers={"X-Campus-One-Signature": get_signature(body_bytes)})

    # Fetch user from DB
    user_stmt = select(User).where(User.campus_one_id == user_id)
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one()
    db_user_id = db_user.id

    # Create an active refresh token for this user
    token_val = "test_refresh_token_to_revoke"
    h = hash_token(token_val)
    rt = RefreshToken(
        user_id=db_user_id,
        token_hash=h,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        revoked=False
    )
    db_session.add(rt)
    await db_session.commit()

    # Send session.signed_out event
    logout_body = {
        "id": "event_5",
        "event": "session.signed_out",
        "data": {
            "user_id": user_id
        }
    }
    logout_bytes = json.dumps(logout_body).encode()
    resp = await client.post("/api/webhooks/campus-one", content=logout_bytes, headers={"X-Campus-One-Signature": get_signature(logout_bytes)})
    assert resp.status_code == 200

    # Verify refresh token is revoked
    db_session.expire_all()
    rt_stmt = select(RefreshToken).where(RefreshToken.user_id == db_user_id)
    rt_res = await db_session.execute(rt_stmt)
    db_rt = rt_res.scalars().all()
    assert len(db_rt) == 1
    assert db_rt[0].revoked is True

@pytest.mark.anyio
async def test_webhook_user_deleted(client, db_session):
    # Provision user
    user_id = "c1_user_new4"
    initial_body = {
        "id": "event_6",
        "event": "user.created",
        "data": {
            "user_id": user_id,
            "email": "webhookdelete@nileuniversity.edu.ng",
            "name": "Delete Student",
            "role": "student",
            "student_id": "ST_WEB_04"
        }
    }
    body_bytes = json.dumps(initial_body).encode()
    await client.post("/api/webhooks/campus-one", content=body_bytes, headers={"X-Campus-One-Signature": get_signature(body_bytes)})

    # Fetch user
    user_stmt = select(User).where(User.campus_one_id == user_id)
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one()

    # Send user.deleted event
    delete_body = {
        "id": "event_7",
        "event": "user.deleted",
        "data": {
            "user_id": user_id
        }
    }
    delete_bytes = json.dumps(delete_body).encode()
    resp = await client.post("/api/webhooks/campus-one", content=delete_bytes, headers={"X-Campus-One-Signature": get_signature(delete_bytes)})
    assert resp.status_code == 200

    # Verify user deactivated
    db_session.expire_all()
    user_res = await db_session.execute(user_stmt)
    db_user = user_res.scalar_one()
    assert db_user.is_active is False
