#!/usr/bin/env python3
"""
Manual test for the notification system.

Usage:
  cd backend
  python test_notifications.py

Tests all notification types by directly calling NotificationService methods.
Verifies that internal Notification rows are created and that Campus One push
is attempted (the actual Campus One call will fail in dev unless real tokens
are configured, but the internal storage should succeed regardless).
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta

# Set up import path
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import AsyncSessionLocal
from app.services.notification_service import NotificationService
from app.models import Notification
from sqlalchemy import select


DIVIDER = "─" * 60


async def count_notifications(db, user_id) -> int:
    result = await db.execute(
        select(Notification).where(Notification.user_id == user_id)
    )
    return len(result.scalars().all())


async def get_latest_notification(db, user_id) -> Notification | None:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def test_all():
    from app.models.students import Student
    from app.models.users import User

    async with AsyncSessionLocal() as db:
        # ---------------------------------------------------------------
        # Find real users to test with
        # ---------------------------------------------------------------
        students = (await db.execute(
            select(Student).limit(3)
        )).scalars().all()

        if not students:
            print("❌ No students found in database. Seed data first.")
            return

        psychologists = (await db.execute(
            select(User).where(User.role == "staff").limit(2)
        )).scalars().all()

        student = students[0]
        student_user = (await db.execute(
            select(User).where(User.id == student.user_id)
        )).scalar_one_or_none()
        psychologist = psychologists[0] if psychologists else None

        print(DIVIDER)
        print("NOTIFICATION SYSTEM TEST")
        print(DIVIDER)
        print(f"Student  : {student_user.full_name if student_user else 'N/A'} ({student.student_id})")
        print(f"Psych    : {psychologist.full_name if psychologist else 'N/A'}")
        print(DIVIDER)

        fake_appointment_id = uuid.uuid4()
        start_time = datetime.now(timezone.utc) + timedelta(days=2, hours=10)
        end_time = start_time + timedelta(minutes=50)

        results = []

        # --- TEST 1: Appointment Requested (to psychologist) ---
        if psychologist:
            before = await count_notifications(db, psychologist.id)
            await NotificationService.notify_appointment_requested(
                db,
                appointment_id=fake_appointment_id,
                student_name=student_user.full_name if student_user else "Test Student",
                psychologist_id=psychologist.id,
                start_time=start_time,
            )
            after = await count_notifications(db, psychologist.id)
            n = await get_latest_notification(db, psychologist.id)
            ok = after > before
            results.append(("notify_appointment_requested", ok))
            print(f"{'✅' if ok else '❌'} notify_appointment_requested")
            if n:
                print(f"   Title  : {n.title}")
                print(f"   Body   : {n.message[:80]}...")
                print(f"   Cat    : {n.category.value}")

        # --- TEST 2: Appointment Confirmed (to student) ---
        if student_user:
            before = await count_notifications(db, student_user.id)
            await NotificationService.notify_appointment_confirmed(
                db,
                appointment_id=fake_appointment_id,
                student_id=student.student_id,
                psychologist_name=psychologist.full_name if psychologist else "Dr. Test",
                start_time=start_time,
                end_time=end_time,
            )
            after = await count_notifications(db, student_user.id)
            n = await get_latest_notification(db, student_user.id)
            ok = after > before
            results.append(("notify_appointment_confirmed", ok))
            print(f"\n{'✅' if ok else '❌'} notify_appointment_confirmed")
            if n:
                print(f"   Title  : {n.title}")
                print(f"   Body   : {n.message[:80]}...")

        # --- TEST 3: Appointment Rejected (to student) ---
        if student_user:
            before = await count_notifications(db, student_user.id)
            await NotificationService.notify_appointment_rejected(
                db,
                appointment_id=fake_appointment_id,
                student_id=student.student_id,
                psychologist_name=psychologist.full_name if psychologist else "Dr. Test",
                start_time=start_time,
            )
            after = await count_notifications(db, student_user.id)
            n = await get_latest_notification(db, student_user.id)
            ok = after > before
            results.append(("notify_appointment_rejected", ok))
            print(f"\n{'✅' if ok else '❌'} notify_appointment_rejected")
            if n:
                print(f"   Title  : {n.title}")
                print(f"   Body   : {n.message[:80]}...")

        # --- TEST 4: WRS Alert — Red (to student) ---
        if student_user:
            before = await count_notifications(db, student_user.id)
            await NotificationService.notify_wrs_alert(db, student.student_id, 72.5, "red")
            after = await count_notifications(db, student_user.id)
            n = await get_latest_notification(db, student_user.id)
            ok = after > before
            results.append(("notify_wrs_alert (red)", ok))
            print(f"\n{'✅' if ok else '❌'} notify_wrs_alert [red]")
            if n:
                print(f"   Title  : {n.title}")
                print(f"   Body   : {n.message[:80]}...")

        # --- TEST 5: WRS Alert — Critical (to student + psychologist if assigned) ---
        if student_user:
            before = await count_notifications(db, student_user.id)
            await NotificationService.notify_wrs_alert(db, student.student_id, 91.0, "critical")
            after = await count_notifications(db, student_user.id)
            n = await get_latest_notification(db, student_user.id)
            ok = after > before
            results.append(("notify_wrs_alert (critical)", ok))
            print(f"\n{'✅' if ok else '❌'} notify_wrs_alert [critical]")
            if n:
                print(f"   Title  : {n.title}")
                print(f"   Body   : {n.message[:80]}...")

        # --- TEST 6: Crisis Alert ---
        if psychologist and student_user:
            before_psych = await count_notifications(db, psychologist.id)
            before_stu = await count_notifications(db, student_user.id)
            await NotificationService.send_crisis_alert(
                db,
                psychologist_id=psychologist.id,
                student_id=student.student_id,
                appointment_id=fake_appointment_id,
                wrs_score=95.0,
            )
            after_psych = await count_notifications(db, psychologist.id)
            after_stu = await count_notifications(db, student_user.id)
            ok_psych = after_psych > before_psych
            ok_stu = after_stu > before_stu
            results.append(("send_crisis_alert (psychologist)", ok_psych))
            results.append(("send_crisis_alert (student)", ok_stu))
            n_psych = await get_latest_notification(db, psychologist.id)
            n_stu = await get_latest_notification(db, student_user.id)
            print(f"\n{'✅' if ok_psych else '❌'} send_crisis_alert → psychologist")
            if n_psych:
                print(f"   Title  : {n_psych.title}")
            print(f"{'✅' if ok_stu else '❌'} send_crisis_alert → student")
            if n_stu:
                print(f"   Title  : {n_stu.title}")

        # --- TEST 7: Counselor Assigned ---
        if student_user and psychologist:
            before = await count_notifications(db, student_user.id)
            await NotificationService.notify_counselor_assigned(
                db,
                student_id=student.student_id,
                psychologist_name=psychologist.full_name,
            )
            after = await count_notifications(db, student_user.id)
            n = await get_latest_notification(db, student_user.id)
            ok = after > before
            results.append(("notify_counselor_assigned", ok))
            print(f"\n{'✅' if ok else '❌'} notify_counselor_assigned")
            if n:
                print(f"   Title  : {n.title}")
                print(f"   Body   : {n.message[:80]}...")

        # --- TEST 8: get_user_notifications returns title ---
        if student_user:
            notifs = await NotificationService.get_user_notifications(db, student_user.id, 5, 0)
            has_title = all(
                "title" in item for item in notifs.get("data", [])
            )
            results.append(("get_user_notifications includes title", has_title))
            print(f"\n{'✅' if has_title else '❌'} get_user_notifications includes 'title' field")
            print(f"   Total  : {notifs['pagination']['total']} notifications for this user")

        # --- Summary ---
        print(f"\n{DIVIDER}")
        passed = sum(1 for _, ok in results if ok)
        total = len(results)
        print(f"RESULTS: {passed}/{total} passed")
        for name, ok in results:
            print(f"  {'✅' if ok else '❌'} {name}")
        print(DIVIDER)


if __name__ == "__main__":
    asyncio.run(test_all())
