"""
SafeSpace — Semester Seed Script
Generates realistic 17-week semester data for analytics testing.

Usage (from project root):
    make seed-data
  OR directly:
    cd backend && ../venv/bin/python seed.py

Credentials for all seeded accounts: ChangeMe123!
"""

import asyncio
import math
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

# ── Path & env setup ─────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

ROOT = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(ROOT, ".env"))

from sqlalchemy import insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password
from app.models.appointments import Appointment, AppointmentStatus, BookingSource
from app.models.consent import Consent
from app.models.crisis_logs import CrisisLog, SeverityLevel
from app.models.risk_scores import RiskScore, RiskTier
from app.models.staff import Staff, StaffType
from app.models.students import Student
from app.models.tables import users_table
from app.models.users import UserRole
from app.models.wellness_checkins import WellnessCheckin, WellnessCheckinType

# ── Constants ─────────────────────────────────────────────────────────────────
SEMESTER_START = datetime(2026, 1, 27, tzinfo=timezone.utc)  # Week 1 Monday
TODAY = datetime(2026, 5, 25, tzinfo=timezone.utc)
TOTAL_WEEKS = 17

PASSWORD_HASH = hash_password("ChangeMe123!")
SEED_RANDOM = random.Random(42)  # deterministic

# ── Student definitions ────────────────────────────────────────────────────────
# (student_id, full_name, level, faculty, base_phq9, variance, weekly_trend, psych_slot)
# base_phq9: typical week-1 PHQ-9 score (0-27)
# variance: ±random noise per week
# weekly_trend: change in PHQ-9 per week (negative = improving)
# psych_slot: 0, 1, or 2 → which psychologist is assigned

STUDENT_DEFS = [
    ("STU001", "Chioma Okafor",      "100L", "Engineering",           5,  2, -0.05, 0),
    ("STU002", "Emeka Nwosu",        "100L", "Engineering",          13,  3,  0.00, 0),
    ("STU003", "Fatima Aliyu",       "100L", "Medicine",              4,  2, -0.03, 0),
    ("STU004", "Yusuf Bello",        "200L", "Medicine",             14,  3,  0.18, 0),
    ("STU005", "Adaeze Eze",         "200L", "Law",                   7,  2, -0.08, 0),
    ("STU006", "Tunde Adeleke",      "200L", "Sciences",             13,  3,  0.05, 0),
    ("STU007", "Ngozi Nwosu",        "300L", "Engineering",          12,  4, -0.02, 0),
    ("STU008", "Kemi Obaseki",       "300L", "Arts & Social Sci",    24,  2,  0.10, 1),
    ("STU009", "Amara Eze",          "300L", "Business Admin",        8,  2, -0.10, 1),
    ("STU010", "Ibrahim Suleiman",   "300L", "Medicine",             16,  3,  0.14, 1),
    ("STU011", "Blessing Obi",       "400L", "Law",                   6,  2, -0.05, 1),
    ("STU012", "Chidi Okonkwo",      "400L", "Engineering",          14,  3,  0.00, 1),
    ("STU013", "Zainab Musa",        "400L", "Sciences",             18,  3,  0.08, 1),
    ("STU014", "Olumide Adeyemi",    "400L", "Business Admin",        9,  2, -0.12, 1),
    ("STU015", "Precious Ejefu",     "400L", "Medicine",             25,  2,  0.05, 2),
    ("STU016", "Ayodeji Williams",   "500L", "Engineering",          15,  3, -0.05, 2),
    ("STU017", "Cynthia Eze",        "500L", "Law",                   7,  2, -0.08, 2),
    ("STU018", "Hassan Abdullahi",   "500L", "Medicine",             18,  3,  0.12, 2),
    ("STU019", "Obiageli Okonkwo",   "500L", "Sciences",             12,  3,  0.00, 2),
    ("STU020", "Temitope Bakare",    "500L", "Business Admin",        6,  2, -0.05, 2),
]

PSYCHOLOGIST_DEFS = [
    ("PSY001", "Dr. Amara Adeyemi",  "amara.adeyemi@psyunit.nileuniversity.edu.ng"),
    ("PSY002", "Dr. Kelechi Ibrahim","kelechi.ibrahim@psyunit.nileuniversity.edu.ng"),
    ("PSY003", "Dr. Bola Okonkwo",   "bola.okonkwo@psyunit.nileuniversity.edu.ng"),
]

EMERGENCY_CONTACTS = [
    ("Mrs. Grace Okafor",    "+2348031234567"),
    ("Mr. Chukwu Nwosu",     "+2348041234568"),
    ("Alhaji Musa Aliyu",    "+2348051234569"),
    ("Mr. Sani Bello",       "+2348061234570"),
    ("Mrs. Ada Eze",         "+2348071234571"),
    ("Mr. Bayo Adeleke",     "+2348081234572"),
    ("Mr. Emeka Nwosu",      "+2348091234573"),
    ("Mrs. Funke Obaseki",   "+2348011234574"),
    ("Mr. Chidi Eze",        "+2348021234575"),
    ("Alhaja Bisi Suleiman", "+2348031234576"),
    ("Mr. Joseph Obi",       "+2348041234577"),
    ("Mrs. Ngozi Okonkwo",   "+2348051234578"),
    ("Alhaji Bello Musa",    "+2348061234579"),
    ("Mrs. Tola Adeyemi",    "+2348071234580"),
    ("Mr. Sunday Ejefu",     "+2348081234581"),
    ("Mr. Dele Williams",    "+2348091234582"),
    ("Mrs. Peace Eze",       "+2348011234583"),
    ("Alhaji Musa Abdullahi","+2348021234584"),
    ("Dr. Chike Okonkwo",    "+2348031234585"),
    ("Mrs. Yemi Bakare",     "+2348041234586"),
]


# ── WRS helpers ───────────────────────────────────────────────────────────────

def phq9_to_wrs(score: int) -> float:
    return round((score / 27) * 100, 2)

def wrs_to_tier(wrs: float) -> RiskTier:
    if wrs >= 85:
        return RiskTier.critical
    elif wrs >= 65:
        return RiskTier.red
    elif wrs >= 40:
        return RiskTier.amber
    return RiskTier.green

def stress_bump(week: int) -> float:
    """Gaussian stress peak at midterms (week 7) and finals (week 15)."""
    mid = 3.0 * math.exp(-0.5 * ((week - 7) / 1.5) ** 2)
    fin = 4.5 * math.exp(-0.5 * ((week - 15) / 1.5) ** 2)
    return mid + fin

def week_score(base: float, variance: float, trend: float, week: int) -> int:
    noise = SEED_RANDOM.uniform(-variance, variance)
    raw = base + trend * week + stress_bump(week) + noise
    return max(0, min(27, round(raw)))

def make_responses_phq9(score: int) -> dict:
    """Distribute a total PHQ-9 score across 9 questions realistically."""
    qs = [0] * 9
    remaining = score
    for i in range(9):
        cap = min(3, remaining)
        v = SEED_RANDOM.randint(0, cap) if remaining > 0 else 0
        qs[i] = v
        remaining -= v
    # If any remaining, add to first question that can take more
    while remaining > 0:
        for i in range(9):
            if qs[i] < 3 and remaining > 0:
                qs[i] += 1
                remaining -= 1
    return {f"q{i+1}": qs[i] for i in range(9)}

def make_responses_gad7(score: int) -> dict:
    score = min(score, 21)  # GAD-7 max is 7 × 3 = 21
    qs = [0] * 7
    remaining = score
    for i in range(7):
        cap = min(3, remaining)
        v = SEED_RANDOM.randint(0, cap) if remaining > 0 else 0
        qs[i] = v
        remaining -= v
    while remaining > 0:
        for i in range(7):
            if qs[i] < 3 and remaining > 0:
                qs[i] += 1
                remaining -= 1
    return {f"q{i+1}": qs[i] for i in range(7)}

def make_responses_pulse() -> dict:
    return {f"q{i+1}": SEED_RANDOM.randint(1, 5) for i in range(5)}


# ── Main seed logic ────────────────────────────────────────────────────────────

async def seed(db: AsyncSession) -> None:
    print("SafeSpace Seed Script")
    print("=" * 50)

    # ── Check if already seeded (students or staff) ───────────────────────────
    existing_student = (await db.execute(
        select(Student.student_id).where(Student.student_id == "STU001")
    )).scalar_one_or_none()
    existing_staff = (await db.execute(
        select(Staff.staff_id).where(Staff.staff_id == "PSY001")
    )).scalar_one_or_none()

    if existing_student or existing_staff:
        print("⚠  Seed data already exists. Clearing...")
        await db.execute(text("DELETE FROM wellness_checkins WHERE student_id LIKE 'STU0%'"))
        await db.execute(text("DELETE FROM risk_scores WHERE student_id LIKE 'STU0%'"))
        await db.execute(text("DELETE FROM risk_overrides WHERE student_id LIKE 'STU0%'"))
        await db.execute(text("DELETE FROM crisis_logs WHERE student_id LIKE 'STU0%'"))
        await db.execute(text(
            "DELETE FROM appointments WHERE student_id LIKE 'STU0%'"
        ))
        await db.execute(text("DELETE FROM consent WHERE student_id LIKE 'STU0%'"))
        # Remove students and their users
        student_user_ids = (await db.execute(
            select(Student.user_id).where(Student.student_id.like("STU0%"))
        )).scalars().all()
        await db.execute(text("DELETE FROM students WHERE student_id LIKE 'STU0%'"))
        for uid in student_user_ids:
            await db.execute(users_table.delete().where(users_table.c.id == uid))
        # Remove psychologist staff (PSY001-PSY003)
        psy_staff_ids = (await db.execute(
            select(Staff.user_id).where(Staff.staff_id.in_(["PSY001", "PSY002", "PSY003"]))
        )).scalars().all()
        # Clear all FK references to these staff before deletion (correct cascade order)
        if psy_staff_ids:
            ids = list(psy_staff_ids)
            # NULL out crisis_logs.appointment_id that reference PSY-staff appointments
            await db.execute(text(
                "UPDATE crisis_logs SET appointment_id = NULL "
                "WHERE appointment_id IN ("
                "  SELECT id FROM appointments WHERE psychologist_id = ANY(:ids)"
                ")"
            ).bindparams(ids=ids))
            # Now safe to delete remaining appointments referencing these staff
            await db.execute(text(
                "DELETE FROM appointments WHERE psychologist_id = ANY(:ids)"
            ).bindparams(ids=ids))
            await db.execute(text(
                "DELETE FROM risk_overrides WHERE psychologist_id = ANY(:ids)"
            ).bindparams(ids=ids))
            await db.execute(text(
                "UPDATE students SET assigned_psychologist_id = NULL "
                "WHERE assigned_psychologist_id = ANY(:ids)"
            ).bindparams(ids=ids))
        await db.execute(text("DELETE FROM staff WHERE staff_id IN ('PSY001','PSY002','PSY003')"))
        for uid in psy_staff_ids:
            await db.execute(users_table.delete().where(users_table.c.id == uid))
        await db.commit()
        print("   Cleared.\n")

    # ── Create psychologists ──────────────────────────────────────────────────
    print("Creating psychologists...")
    psych_user_ids: list[uuid.UUID] = []
    now = datetime.now(timezone.utc)

    for staff_id, name, email in PSYCHOLOGIST_DEFS:
        uid = uuid.uuid4()
        psych_user_ids.append(uid)
        await db.execute(insert(users_table).values(
            id=uid, email=email, full_name=name,
            role=UserRole.staff.value, is_admin=False, is_active=True,
            password_hash=PASSWORD_HASH, created_at=now, updated_at=now,
        ))
        db.add(Staff(
            user_id=uid, staff_id=staff_id,
            staff_type=StaffType.psychologist,
            department="Psychology Unit",
            specialization="University student mental health and crisis intervention",
            max_appointments_per_day=8,
        ))

    await db.flush()
    print(f"   Created {len(PSYCHOLOGIST_DEFS)} psychologists.")

    # ── Create students ───────────────────────────────────────────────────────
    print("Creating students...")
    student_user_ids: dict[str, uuid.UUID] = {}  # student_id → user_id

    for i, (sid, name, level, faculty, *_rest, psych_slot) in enumerate(STUDENT_DEFS):
        uid = uuid.uuid4()
        student_user_ids[sid] = uid
        email = f"{sid.lower()}@student.nileuniversity.edu.ng"
        ec_name, ec_phone = EMERGENCY_CONTACTS[i]
        psych_uid = psych_user_ids[psych_slot]

        await db.execute(insert(users_table).values(
            id=uid, email=email, full_name=name,
            role=UserRole.student.value, is_admin=False, is_active=True,
            password_hash=PASSWORD_HASH, created_at=now, updated_at=now,
        ))
        db.add(Student(
            student_id=sid, user_id=uid, class_level=level,
            assigned_psychologist_id=psych_uid,
            guidance_counselor=PSYCHOLOGIST_DEFS[psych_slot][1],
            emergency_contact=ec_name,
            emergency_phone=ec_phone,
            crisis_flag=False,
        ))

    # Flush students first before adding Consent records (Consent has FK to students
    # but no ORM relationship, so SQLAlchemy can't auto-sort insert order)
    await db.flush()

    for sid, *_ in STUDENT_DEFS:
        db.add(Consent(student_id=sid, monitoring_enabled=True))

    await db.commit()
    print(f"   Created {len(STUDENT_DEFS)} students.")

    # ── Generate semester check-in data (one bulk INSERT for all weeks) ────────
    print("Generating semester check-ins and risk scores...")
    all_checkins: list[dict] = []
    all_risks: list[dict] = []
    latest_wrs: dict[str, float] = {}

    for week in range(TOTAL_WEEKS):
        week_monday = SEMESTER_START + timedelta(weeks=week)
        if week_monday > TODAY:
            break

        indices = list(range(len(STUDENT_DEFS)))
        SEED_RANDOM.shuffle(indices)

        for idx in indices:
            sid, name, level, faculty, base, variance, trend, psych_slot = STUDENT_DEFS[idx]

            # Monday: PHQ-9
            phq9_day = week_monday
            if phq9_day <= TODAY:
                phq9_score = week_score(base, variance, trend, week)
                wrs = phq9_to_wrs(phq9_score)
                tier = wrs_to_tier(wrs)
                latest_wrs[sid] = wrs
                submitted = phq9_day.replace(
                    hour=SEED_RANDOM.randint(8, 18), minute=SEED_RANDOM.randint(0, 59)
                )
                all_checkins.append(dict(
                    id=uuid.uuid4(), student_id=sid,
                    type=WellnessCheckinType.phq9,
                    responses=make_responses_phq9(phq9_score),
                    score=phq9_score, severity_label=None,
                    submitted_at=submitted,
                ))
                all_risks.append(dict(
                    id=uuid.uuid4(), student_id=sid,
                    wrs_score=wrs, tier=tier, computed_at=submitted,
                ))

            # Alternate Wednesday: GAD-7
            if week % 2 == 0:
                gad7_day = week_monday + timedelta(days=2)
                if gad7_day <= TODAY:
                    gad7_score = week_score(base * 0.85, variance, trend * 0.9, week)
                    gad7_wrs = phq9_to_wrs(gad7_score)
                    gad7_tier = wrs_to_tier(gad7_wrs)
                    submitted = gad7_day.replace(
                        hour=SEED_RANDOM.randint(9, 17), minute=SEED_RANDOM.randint(0, 59)
                    )
                    all_checkins.append(dict(
                        id=uuid.uuid4(), student_id=sid,
                        type=WellnessCheckinType.gad7,
                        responses=make_responses_gad7(gad7_score),
                        score=gad7_score, severity_label=None,
                        submitted_at=submitted,
                    ))
                    all_risks.append(dict(
                        id=uuid.uuid4(), student_id=sid,
                        wrs_score=gad7_wrs, tier=gad7_tier, computed_at=submitted,
                    ))

            # Every Friday: Pulse
            pulse_day = week_monday + timedelta(days=4)
            if pulse_day <= TODAY:
                submitted = pulse_day.replace(
                    hour=SEED_RANDOM.randint(10, 20), minute=SEED_RANDOM.randint(0, 59)
                )
                all_checkins.append(dict(
                    id=uuid.uuid4(), student_id=sid,
                    type=WellnessCheckinType.pulse,
                    responses=make_responses_pulse(),
                    score=None, severity_label=None,
                    submitted_at=submitted,
                ))

    print(f"   Built {len(all_checkins)} check-ins, {len(all_risks)} risk scores in memory. Inserting...")
    # Split into chunks of 200 rows to stay within Supabase parameter limits
    CHUNK = 200
    for i in range(0, len(all_checkins), CHUNK):
        chunk = all_checkins[i:i + CHUNK]
        await db.execute(insert(WellnessCheckin).values(chunk))
        await db.commit()
    for i in range(0, len(all_risks), CHUNK):
        chunk = all_risks[i:i + CHUNK]
        await db.execute(insert(RiskScore).values(chunk))
        await db.commit()
    print(f"   Done. {len(all_checkins)} check-ins, {len(all_risks)} risk scores inserted.")

    # ── Create appointments (bulk insert) ─────────────────────────────────────
    print("Creating appointments...")
    appt_rows: list[dict] = []

    for sid, name, level, faculty, base, variance, trend, psych_slot in STUDENT_DEFS:
        wrs = latest_wrs.get(sid, phq9_to_wrs(base))
        tier = wrs_to_tier(wrs)
        psych_uid = psych_user_ids[psych_slot]

        n_completed = {
            RiskTier.green: 0,
            RiskTier.amber: 1,
            RiskTier.red: 3,
            RiskTier.critical: 4,
        }[tier]
        n_upcoming = 1 if tier in (RiskTier.red, RiskTier.critical) else 0
        is_crisis_booking = tier in (RiskTier.red, RiskTier.critical)

        for k in range(n_completed):
            appt_date = SEMESTER_START + timedelta(
                weeks=SEED_RANDOM.randint(1, TOTAL_WEEKS - 2),
                hours=SEED_RANDOM.choice([9, 10, 11, 14, 15, 16]),
            )
            if appt_date > TODAY:
                appt_date = TODAY - timedelta(days=SEED_RANDOM.randint(3, 20))
            appt_rows.append(dict(
                id=uuid.uuid4(), student_id=sid, psychologist_id=psych_uid,
                start_time=appt_date, end_time=appt_date + timedelta(hours=1),
                status=AppointmentStatus.completed,
                is_crisis=is_crisis_booking and k == 0,
                booking_source=BookingSource.student_portal,
            ))

        if n_upcoming:
            future_date = TODAY + timedelta(
                days=SEED_RANDOM.randint(3, 14),
                hours=SEED_RANDOM.choice([10, 11, 14, 15]),
            )
            appt_rows.append(dict(
                id=uuid.uuid4(), student_id=sid, psychologist_id=psych_uid,
                start_time=future_date, end_time=future_date + timedelta(hours=1),
                status=AppointmentStatus.booked, is_crisis=False,
                booking_source=BookingSource.student_portal,
            ))

    if appt_rows:
        await db.execute(insert(Appointment).values(appt_rows))
    await db.commit()
    print(f"   Created {len(appt_rows)} appointments.")

    # ── Create crisis logs (bulk insert) ──────────────────────────────────────
    print("Creating crisis logs...")
    crisis_rows: list[dict] = []
    crisis_student_ids: list[str] = []

    critical_students = [s for s in STUDENT_DEFS if phq9_to_wrs(s[4]) >= 85]
    red_students = [s for s in STUDENT_DEFS if 65 <= phq9_to_wrs(s[4]) < 85]

    for sid, *_rest in critical_students:
        crisis_student_ids.append(sid)
        for _ in range(2):
            log_date = SEMESTER_START + timedelta(weeks=SEED_RANDOM.randint(2, TOTAL_WEEKS - 1))
            crisis_rows.append(dict(
                id=uuid.uuid4(), student_id=sid,
                severity_level=SeverityLevel.high,
                action_taken="Crisis protocol initiated. Emergency contact notified. Student referred to on-call psychologist.",
                resolved=False, resolved_at=None, created_at=log_date,
            ))

    for sid, *_rest in red_students[:2]:
        log_date = SEMESTER_START + timedelta(weeks=SEED_RANDOM.randint(4, 10))
        resolved_at = log_date + timedelta(days=SEED_RANDOM.randint(1, 5))
        crisis_rows.append(dict(
            id=uuid.uuid4(), student_id=sid,
            severity_level=SeverityLevel.medium,
            action_taken="Follow-up session scheduled. Student monitored closely. Check-in frequency increased.",
            resolved=True, resolved_at=resolved_at, created_at=log_date,
        ))

    if crisis_rows:
        await db.execute(insert(CrisisLog).values(crisis_rows))
    if crisis_student_ids:
        await db.execute(
            text("UPDATE students SET crisis_flag = true WHERE student_id = ANY(:ids)"),
            {"ids": crisis_student_ids},
        )
    await db.commit()
    print(f"   Created {len(crisis_rows)} crisis logs.")

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("=" * 50)
    print("Seed complete!")
    print()
    print("Accounts (password: ChangeMe123!):")
    print()
    print("  Psychologists:")
    for staff_id, name, email in PSYCHOLOGIST_DEFS:
        print(f"    {staff_id}  {name}")
        print(f"           {email}")
    print()
    print("  Students:")
    for sid, name, level, faculty, base, *_ in STUDENT_DEFS:
        wrs = phq9_to_wrs(base)
        tier = wrs_to_tier(wrs).value.upper()
        print(f"    {sid}  {name:<22} {level}  {faculty:<20} ~WRS {wrs:.0f} ({tier})")


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Disable per-statement timeout for this seed session
        await db.execute(text("SET statement_timeout = 0"))
        await seed(db)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
