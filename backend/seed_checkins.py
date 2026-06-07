#!/usr/bin/env python3
"""
Seed recent wellness checkins to populate dashboard analytics.
This creates checkins from the past 7 days so the dashboard shows real engagement data.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.student import Student
from app.models.wellness_checkin import WellnessCheckin, CheckinType
import random

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed_checkins():
    """Add wellness checkins for the last 7 days to show engagement on dashboard."""
    async with AsyncSessionLocal() as db:
        # Get all active students
        result = await db.execute(select(Student).where(Student.is_active == True))
        students = result.scalars().all()

        if not students:
            print("No active students found. Please run seed.py first.")
            return

        print(f"Found {len(students)} active students")

        # Create checkins for the past 7 days
        now = datetime.now(timezone.utc)
        created = 0

        for i in range(7):
            # Go back i days from today
            checkin_date = now - timedelta(days=i)

            # 70% of students submit checkins each day
            students_submitting = random.sample(students, int(len(students) * 0.7))

            for student in students_submitting:
                # Randomly assign a checkin type
                checkin_type = random.choice([CheckinType.pulse, CheckinType.pulse, CheckinType.phq9, CheckinType.gad7])

                # Create a checkin with random score
                if checkin_type == CheckinType.pulse:
                    score = random.randint(20, 85)  # Pulse is simpler, lower scores
                else:
                    score = random.randint(10, 95)  # PHQ-9 and GAD-7 have wider range

                checkin = WellnessCheckin(
                    student_id=student.student_id,
                    type=checkin_type,
                    score=score,
                    submitted_at=checkin_date,
                )
                db.add(checkin)
                created += 1

        await db.commit()
        print(f"✅ Created {created} wellness checkins for the past 7 days")
        print("Dashboard will now show real engagement data!")


if __name__ == "__main__":
    asyncio.run(seed_checkins())
