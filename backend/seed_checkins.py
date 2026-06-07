#!/usr/bin/env python3
"""
Seed recent wellness checkins to populate dashboard analytics.
This creates checkins from the past 7 days so the dashboard shows real engagement data.

Usage:
    cd backend && python seed_checkins.py
"""

import asyncio
import os
import sys
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# ── Path & env setup ─────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
ROOT = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(ROOT, ".env"))

from app.core.config import settings
from app.models.students import Student
from app.models.wellness_checkins import WellnessCheckin, WellnessCheckinType
from app.models.risk_scores import RiskScore, RiskTier
from app.services.risk_simple import calculate_wrs_and_tier
import uuid

engine = create_async_engine(settings.DATABASE_URL, echo=False)
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
                checkin_type = random.choice([WellnessCheckinType.pulse, WellnessCheckinType.pulse, WellnessCheckinType.phq9, WellnessCheckinType.gad7])

                # Create a checkin with random score
                if checkin_type == WellnessCheckinType.pulse:
                    score = random.randint(20, 85)  # Pulse is simpler, lower scores
                    responses = {"mood": random.choice(["good", "ok", "bad"]), "energy": random.randint(1, 10)}
                elif checkin_type == WellnessCheckinType.phq9:
                    score = random.randint(10, 95)  # PHQ-9 has wider range
                    responses = {f"q{i}": random.randint(0, 3) for i in range(1, 10)}  # 9 questions, 0-3 scale
                else:  # GAD-7
                    score = random.randint(10, 95)
                    responses = {f"q{i}": random.randint(0, 3) for i in range(1, 8)}  # 7 questions, 0-3 scale

                checkin = WellnessCheckin(
                    student_id=student.student_id,
                    type=checkin_type,
                    score=score,
                    responses=responses,
                    submitted_at=checkin_date,
                )
                db.add(checkin)

                # Only create RiskScore for PHQ-9 and GAD-7 (not Pulse)
                if checkin_type in [WellnessCheckinType.phq9, WellnessCheckinType.gad7]:
                    wrs_score, tier_str = calculate_wrs_and_tier(checkin_type.value, score)
                    risk_score = RiskScore(
                        student_id=student.student_id,
                        wrs_score=wrs_score,
                        tier=RiskTier(tier_str),
                        computed_at=checkin_date,
                    )
                    db.add(risk_score)

                created += 1

        await db.commit()
        print(f"✅ Created {created} wellness checkins for the past 7 days")
        print("Dashboard will now show real engagement data!")


if __name__ == "__main__":
    asyncio.run(seed_checkins())
