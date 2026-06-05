from datetime import date, datetime, time, timedelta
from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointments import Appointment, AppointmentStatus, BookingSource
from app.models.crisis_logs import CrisisLog, SeverityLevel
from app.models.psychologist_availability import PsychologistAvailability, PsychologistBusyBlock
from app.models.staff import Staff, StaffType
from app.models.students import Student
from app.services.scheduling_service import check_confirmed_appointment_conflict
from app.models.tables import sessions_table, users_table
from app.schemas.appointments import (
    AppointmentCreate,
    AppointmentRequestCreate,
    AppointmentUpdate,
)
from app.utils.notification_stub import send_crisis_alert
from app.utils.pagination import paginate


def _paginate_payload(items: list[dict[str, Any]], total: int, limit: int, offset: int) -> dict[str, Any]:
    try:
        return paginate(items, total, limit, offset)
    except TypeError:
        return paginate(data=items, total=total, limit=limit, offset=offset)


class AppointmentService:
    @staticmethod
    async def _get_student_by_user_id(
        db: AsyncSession,
        user_id: UUID,
    ) -> Student:
        student = (
            await db.execute(
                select(Student)
                .join(users_table, users_table.c.id == Student.user_id)
                .where(
                    Student.user_id == user_id,
                    users_table.c.deleted_at.is_(None),
                    users_table.c.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        if not student:
            raise LookupError("Student not found")
        return student

    @staticmethod
    async def _ensure_psychologist_active(db: AsyncSession, psychologist_id: UUID) -> Staff:
        staff = (
            await db.execute(
                select(Staff)
                .join(users_table, users_table.c.id == Staff.user_id)
                .where(
                    Staff.user_id == psychologist_id,
                    Staff.staff_type == StaffType.psychologist,
                    users_table.c.is_active.is_(True),
                    users_table.c.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if not staff:
            raise LookupError("Psychologist not found or inactive")
        return staff

    @staticmethod
    async def _ensure_student_visible(
        db: AsyncSession,
        student_id: str,
        current_user: dict | None = None,
    ) -> Student:
        query = (
            select(Student)
            .join(users_table, users_table.c.id == Student.user_id)
            .where(Student.student_id == student_id, users_table.c.deleted_at.is_(None))
        )
        if current_user and current_user.get("role") == "psychologist":
            query = query.where(Student.assigned_psychologist_id == current_user["id"])
        student = (await db.execute(query)).scalar_one_or_none()
        if not student:
            raise LookupError("Student not found")
        return student

    @staticmethod
    async def _find_conflict(
        db: AsyncSession,
        psychologist_id: UUID,
        start_time: datetime,
        end_time: datetime,
        exclude_id: UUID | None = None,
    ) -> Appointment | None:
        return await check_confirmed_appointment_conflict(
            db,
            psychologist_id,
            start_time,
            end_time,
            exclude_id=exclude_id,
        )

    @staticmethod
    async def _validate_time_granularity(
        start_time: datetime,
        end_time: datetime,
        granularity_minutes: int = 15,
    ) -> None:
        if start_time.second != 0 or start_time.microsecond != 0:
            raise ValueError("start_time must be on a 15-minute boundary")
        if end_time.second != 0 or end_time.microsecond != 0:
            raise ValueError("end_time must be on a 15-minute boundary")
        total_minutes = int((end_time - start_time).total_seconds() / 60)
        if total_minutes <= 0 or total_minutes % granularity_minutes != 0:
            raise ValueError("Appointment duration must use 15-minute increments")

    @staticmethod
    async def _ensure_fits_availability(
        db: AsyncSession,
        psychologist_id: UUID,
        start_time: datetime,
        end_time: datetime,
    ) -> None:
        availability = (
            await db.execute(
                select(PsychologistAvailability)
                .where(
                    PsychologistAvailability.psychologist_id == psychologist_id,
                    PsychologistAvailability.date == start_time.date(),
                    PsychologistAvailability.start_time <= start_time.time(),
                    PsychologistAvailability.end_time >= end_time.time(),
                )
            )
        ).scalar_one_or_none()
        if not availability:
            raise FileExistsError("Requested time is outside psychologist availability")

    @staticmethod
    async def _ensure_does_not_overlap_busy_block(
        db: AsyncSession,
        psychologist_id: UUID,
        start_time: datetime,
        end_time: datetime,
    ) -> None:
        busy = await db.execute(
            select(PsychologistBusyBlock)
            .where(
                PsychologistBusyBlock.psychologist_id == psychologist_id,
                PsychologistBusyBlock.block_end > start_time,
                PsychologistBusyBlock.block_start < end_time,
            )
            .limit(1)
        )
        if busy.scalar_one_or_none():
            raise FileExistsError("Requested time overlaps an unavailable busy block")

    @staticmethod
    async def _ensure_session_duration_matches(
        staff: Staff,
        start_time: datetime,
        end_time: datetime,
    ) -> None:
        if staff.session_duration_minutes and (end_time - start_time) != timedelta(minutes=staff.session_duration_minutes):
            raise ValueError(
                f"Appointments must match psychologist session duration of {staff.session_duration_minutes} minutes"
            )

    @staticmethod
    async def _get_appointment_entity(db: AsyncSession, appointment_id: UUID) -> Appointment:
        appointment = (
            await db.execute(
                select(Appointment)
                .where(Appointment.id == appointment_id, Appointment.deleted_at.is_(None))
            )
        ).scalar_one_or_none()
        if not appointment:
            raise LookupError("Appointment not found")
        return appointment

    @classmethod
    async def request_appointment(
        cls,
        db: AsyncSession,
        current_user: dict,
        appointment_data: AppointmentRequestCreate,
    ) -> Appointment:
        student = await cls._get_student_by_user_id(db, current_user["id"])
        staff = await cls._ensure_psychologist_active(db, appointment_data.psychologist_id)

        await cls._validate_time_granularity(
            appointment_data.start_time,
            appointment_data.end_time,
        )
        await cls._ensure_session_duration_matches(
            staff,
            appointment_data.start_time,
            appointment_data.end_time,
        )

        if not appointment_data.is_crisis:
            await cls._ensure_fits_availability(
                db,
                appointment_data.psychologist_id,
                appointment_data.start_time,
                appointment_data.end_time,
            )
            await cls._ensure_does_not_overlap_busy_block(
                db,
                appointment_data.psychologist_id,
                appointment_data.start_time,
                appointment_data.end_time,
            )
            conflict = await cls._find_conflict(
                db,
                appointment_data.psychologist_id,
                appointment_data.start_time,
                appointment_data.end_time,
            )
            if conflict:
                raise FileExistsError("Psychologist has a conflicting confirmed appointment at this time")

        appointment = Appointment(
            student_id=student.student_id,
            psychologist_id=appointment_data.psychologist_id,
            start_time=appointment_data.start_time,
            end_time=appointment_data.end_time,
            status=AppointmentStatus.confirmed if appointment_data.is_crisis else AppointmentStatus.pending,
            is_crisis=appointment_data.is_crisis,
            crisis_note=appointment_data.crisis_note,
            booking_source=BookingSource.student_portal,
        )
        db.add(appointment)
        await db.flush()

        if appointment_data.is_crisis:
            db.add(
                CrisisLog(
                    appointment_id=appointment.id,
                    student_id=student.student_id,
                    severity_level=SeverityLevel.high,
                    action_taken=appointment_data.crisis_note or "Student crisis booking created",
                    alert_sent_at=datetime.utcnow(),
                )
            )

        await db.commit()
        await db.refresh(appointment)
        return appointment

    @classmethod
    async def approve_appointment(cls, db: AsyncSession, appointment_id: UUID) -> dict[str, Any]:
        appointment = await cls._get_appointment_entity(db, appointment_id)
        if appointment.status != AppointmentStatus.pending:
            raise ValueError("Only pending requests can be approved")

        conflict = await cls._find_conflict(
            db,
            appointment.psychologist_id,
            appointment.start_time,
            appointment.end_time,
            exclude_id=appointment.id,
        )
        if conflict:
            raise FileExistsError("Appointment conflicts with an existing confirmed appointment")

        await db.execute(
            update(Appointment)
            .where(Appointment.id == appointment.id)
            .values(status=AppointmentStatus.confirmed)
        )
        await db.execute(
            update(Appointment)
            .where(
                Appointment.psychologist_id == appointment.psychologist_id,
                Appointment.id != appointment.id,
                Appointment.status == AppointmentStatus.pending,
                Appointment.deleted_at.is_(None),
                func.tstzrange(Appointment.start_time, Appointment.end_time).op("&&")(
                    func.tstzrange(appointment.start_time, appointment.end_time)
                ),
            )
            .values(status=AppointmentStatus.rejected)
        )
        await db.commit()
        return await cls.get_by_id(db, appointment.id)

    @classmethod
    async def reject_appointment(cls, db: AsyncSession, appointment_id: UUID) -> dict[str, Any]:
        appointment = await cls._get_appointment_entity(db, appointment_id)
        if appointment.status != AppointmentStatus.pending:
            raise ValueError("Only pending requests can be rejected")
        await db.execute(
            update(Appointment)
            .where(Appointment.id == appointment.id)
            .values(status=AppointmentStatus.rejected)
        )
        await db.commit()
        return await cls.get_by_id(db, appointment.id)

    @classmethod
    async def create(
        cls,
        db: AsyncSession,
        data: AppointmentCreate,
        background_tasks: BackgroundTasks,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        await cls._ensure_psychologist_active(db, data.psychologist_id)
        await cls._ensure_student_visible(db, data.student_id, current_user=current_user)

        conflict = None
        if not data.is_crisis:
            conflict = await cls._find_conflict(db, data.psychologist_id, data.start_time, data.end_time)
        if conflict and not data.is_crisis:
            raise FileExistsError("Psychologist has a conflicting booking at this time")

        appointment = Appointment(
            student_id=data.student_id,
            psychologist_id=data.psychologist_id,
            start_time=data.start_time,
            end_time=data.end_time,
            status=AppointmentStatus.booked,
            is_crisis=data.is_crisis,
            crisis_note=data.crisis_note,
            booking_source=data.booking_source,
        )
        db.add(appointment)
        await db.flush()

        if data.is_crisis:
            db.add(
                CrisisLog(
                    appointment_id=appointment.id,
                    student_id=data.student_id,
                    severity_level=SeverityLevel.high,
                    action_taken=data.crisis_note or "Emergency booking created",
                    alert_sent_at=datetime.utcnow(),
                )
            )
            background_tasks.add_task(
                send_crisis_alert,
                str(data.psychologist_id),
                str(data.student_id),
                str(appointment.id),
            )

        await db.commit()
        return await cls.get_by_id(db, appointment.id, current_user=current_user)

    @classmethod
    async def get_all(
        cls,
        db: AsyncSession,
        filters: dict[str, Any],
        limit: int,
        offset: int,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        student_user = users_table.alias("student_user")
        psychologist_user = users_table.alias("psychologist_user")
        query = (
            select(
                Appointment,
                student_user.c.full_name.label("student_full_name"),
                psychologist_user.c.full_name.label("psychologist_full_name"),
                sessions_table.c.summary.label("session_summary"),
            )
            .join(Student, Student.student_id == Appointment.student_id)
            .join(student_user, student_user.c.id == Student.user_id)
            .join(Staff, Staff.user_id == Appointment.psychologist_id)
            .join(psychologist_user, psychologist_user.c.id == Appointment.psychologist_id)
            .outerjoin(sessions_table, sessions_table.c.appointment_id == Appointment.id)
            .where(
                Appointment.deleted_at.is_(None),
                student_user.c.deleted_at.is_(None),
                psychologist_user.c.deleted_at.is_(None),
            )
        )
        if current_user and current_user.get("role") == "psychologist":
            query = query.where(Appointment.psychologist_id == current_user["id"])
        if filters.get("psychologist_id"):
            query = query.where(Appointment.psychologist_id == filters["psychologist_id"])
        if filters.get("student_id"):
            query = query.where(Appointment.student_id == filters["student_id"])
        if filters.get("status"):
            query = query.where(Appointment.status == filters["status"])
        if filters.get("is_crisis") is not None:
            query = query.where(Appointment.is_crisis == filters["is_crisis"])
        if filters.get("start_date"):
            query = query.where(Appointment.start_time >= filters["start_date"])
        if filters.get("end_date"):
            query = query.where(Appointment.end_time <= filters["end_date"])

        total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        rows = (await db.execute(query.order_by(Appointment.start_time.desc()).limit(limit).offset(offset))).all()
        data = [
            {
                "id": row.Appointment.id,
                "student_id": row.Appointment.student_id,
                "psychologist_id": row.Appointment.psychologist_id,
                "start_time": row.Appointment.start_time,
                "end_time": row.Appointment.end_time,
                "status": row.Appointment.status,
                "is_crisis": row.Appointment.is_crisis,
                "crisis_note": row.Appointment.crisis_note,
                "booking_source": row.Appointment.booking_source,
                "calendar_event_id": row.Appointment.calendar_event_id,
                "deleted_at": row.Appointment.deleted_at,
                "created_at": row.Appointment.created_at,
                "student_full_name": row.student_full_name,
                "psychologist_full_name": row.psychologist_full_name,
                "session_summary": row.session_summary,
            }
            for row in rows
        ]
        return _paginate_payload(data, total, limit, offset)

    @classmethod
    async def list_availability(
        cls,
        db: AsyncSession,
        psychologist_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict[str, Any]]:
        query = select(PsychologistAvailability)
        if psychologist_id:
            query = query.where(PsychologistAvailability.psychologist_id == psychologist_id)
        if start_date:
            query = query.where(PsychologistAvailability.date >= start_date)
        if end_date:
            query = query.where(PsychologistAvailability.date <= end_date)

        rows = (
            await db.execute(
                query.order_by(
                    PsychologistAvailability.date.asc(),
                    PsychologistAvailability.start_time.asc(),
                )
            )
        ).scalars().all()

        return [
            {
                "id": str(row.id),
                "psychologist_id": str(row.psychologist_id),
                "date": row.date.isoformat(),
                "start_time": row.start_time.strftime("%H:%M"),
                "end_time": row.end_time.strftime("%H:%M"),
                "status": "available",
            }
            for row in rows
        ]

    @classmethod
    async def get_availability(cls, db: AsyncSession, psychologist_id: UUID, day: date) -> list[str]:
        staff = await cls._ensure_psychologist_active(db, psychologist_id)

        blocks = (
            await db.execute(
                select(PsychologistAvailability)
                .where(
                    PsychologistAvailability.psychologist_id == psychologist_id,
                    PsychologistAvailability.date == day,
                )
                .order_by(PsychologistAvailability.start_time.asc())
            )
        ).scalars().all()

        if not blocks:
            return []

        appointments = (
            await db.execute(
                select(Appointment.start_time, Appointment.end_time)
                .where(
                    Appointment.psychologist_id == psychologist_id,
                    Appointment.deleted_at.is_(None),
                    Appointment.status.in_({AppointmentStatus.confirmed, AppointmentStatus.booked}),
                    Appointment.start_time >= datetime.combine(day, time.min),
                    Appointment.end_time <= datetime.combine(day, time.max),
                )
                .order_by(Appointment.start_time.asc())
            )
        ).all()

        day_start_dt = datetime.combine(day, time.min)
        day_end_dt = datetime.combine(day, time.max)
        busy_rows = (
            await db.execute(
                select(PsychologistBusyBlock.block_start, PsychologistBusyBlock.block_end)
                .where(
                    PsychologistBusyBlock.psychologist_id == psychologist_id,
                    PsychologistBusyBlock.block_end > day_start_dt,
                    PsychologistBusyBlock.block_start < day_end_dt,
                )
            )
        ).all()

        def _naive(dt: datetime) -> datetime:
            return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt

        busy_ranges = [(_naive(r.block_start), _naive(r.block_end)) for r in busy_rows]
        appt_ranges = [(_naive(r.start_time), _naive(r.end_time)) for r in appointments]

        duration = timedelta(minutes=staff.session_duration_minutes)
        slots: list[str] = []

        for block in blocks:
            current = datetime.combine(day, block.start_time)
            block_end = datetime.combine(day, block.end_time)
            while current + duration <= block_end:
                candidate_end = current + duration
                overlaps = any(current < e and candidate_end > s for s, e in appt_ranges + busy_ranges)
                if not overlaps:
                    slots.append(f"{current.isoformat()} / {candidate_end.isoformat()}")
                current += duration

        return slots[: staff.max_appointments_per_day]

    @classmethod
    async def get_by_id(
        cls,
        db: AsyncSession,
        appointment_id: UUID,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        student_user = users_table.alias("student_user")
        psychologist_user = users_table.alias("psychologist_user")
        query = (
            select(
                Appointment,
                student_user.c.full_name.label("student_full_name"),
                psychologist_user.c.full_name.label("psychologist_full_name"),
                sessions_table.c.summary.label("session_summary"),
            )
            .join(Student, Student.student_id == Appointment.student_id)
            .join(student_user, student_user.c.id == Student.user_id)
            .join(psychologist_user, psychologist_user.c.id == Appointment.psychologist_id)
            .outerjoin(sessions_table, sessions_table.c.appointment_id == Appointment.id)
            .where(
                Appointment.id == appointment_id,
                Appointment.deleted_at.is_(None),
                student_user.c.deleted_at.is_(None),
                psychologist_user.c.deleted_at.is_(None),
            )
        )
        if current_user and current_user.get("role") == "psychologist":
            query = query.where(Appointment.psychologist_id == current_user["id"])
        row = (await db.execute(query)).first()
        if not row:
            raise LookupError("Appointment not found")
        return {
            "id": row.Appointment.id,
            "student_id": row.Appointment.student_id,
            "psychologist_id": row.Appointment.psychologist_id,
            "start_time": row.Appointment.start_time,
            "end_time": row.Appointment.end_time,
            "status": row.Appointment.status,
            "is_crisis": row.Appointment.is_crisis,
            "crisis_note": row.Appointment.crisis_note,
            "booking_source": row.Appointment.booking_source,
            "calendar_event_id": row.Appointment.calendar_event_id,
            "deleted_at": row.Appointment.deleted_at,
            "created_at": row.Appointment.created_at,
            "student_full_name": row.student_full_name,
            "psychologist_full_name": row.psychologist_full_name,
            "session_summary": row.session_summary,
        }

    @classmethod
    async def update(
        cls,
        db: AsyncSession,
        appointment_id: UUID,
        data: AppointmentUpdate,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        existing = await cls.get_by_id(db, appointment_id, current_user=current_user)
        payload = data.model_dump(exclude_unset=True)
        if "start_time" in payload or "end_time" in payload:
            start_time = payload.get("start_time", existing["start_time"])
            end_time = payload.get("end_time", existing["end_time"])
            conflict = await cls._find_conflict(
                db,
                existing["psychologist_id"],
                start_time,
                end_time,
                exclude_id=appointment_id,
            )
            if conflict:
                raise FileExistsError("Psychologist has a conflicting booking at this time")
        await db.execute(update(Appointment).where(Appointment.id == appointment_id).values(**payload))
        await db.commit()
        return await cls.get_by_id(db, appointment_id, current_user=current_user)

    @classmethod
    async def soft_delete(cls, db: AsyncSession, appointment_id: UUID) -> None:
        appointment = (
            await db.execute(
                select(Appointment, sessions_table.c.id.label("session_id"))
                .outerjoin(sessions_table, sessions_table.c.appointment_id == Appointment.id)
                .where(Appointment.id == appointment_id, Appointment.deleted_at.is_(None))
            )
        ).first()
        if not appointment:
            raise LookupError("Appointment not found")
        if appointment.Appointment.status not in {AppointmentStatus.booked, AppointmentStatus.cancelled}:
            raise ValueError("Only booked or cancelled appointments can be deleted")
        if appointment.session_id is not None:
            raise ValueError("Cannot delete appointment with linked session")
        await db.execute(update(Appointment).where(Appointment.id == appointment_id).values(deleted_at=datetime.utcnow()))
        await db.commit()
