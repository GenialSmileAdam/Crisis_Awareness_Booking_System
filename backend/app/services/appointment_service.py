from datetime import date, datetime, time, timedelta
from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointments import Appointment, AppointmentStatus
from app.models.crisis_logs import CrisisLog, SeverityLevel
from app.models.staff import Staff, StaffType
from app.models.students import Student
from app.models.tables import sessions_table, users_table
from app.schemas.appointments import AppointmentCreate, AppointmentUpdate
from app.utils.notification_stub import send_crisis_alert
from app.utils.pagination import paginate


def _paginate_payload(items: list[dict[str, Any]], total: int, limit: int, offset: int) -> dict[str, Any]:
    try:
        return paginate(items, total, limit, offset)
    except TypeError:
        return paginate(data=items, total=total, limit=limit, offset=offset)


class AppointmentService:
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
        conflict = await db.execute(
            select(Appointment).where(
                Appointment.psychologist_id == psychologist_id,
                Appointment.status == AppointmentStatus.booked,
                Appointment.deleted_at.is_(None),
                Appointment.id != exclude_id,
                func.tstzrange(Appointment.start_time, Appointment.end_time).op("&&")(
                    func.tstzrange(start_time, end_time)
                ),
            ).limit(1)
        )
        return conflict.scalar_one_or_none()

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
    async def get_availability(cls, db: AsyncSession, psychologist_id: UUID, day: date) -> list[str]:
        staff = await cls._ensure_psychologist_active(db, psychologist_id)
        start_of_day = datetime.combine(day, time(hour=9))
        end_of_day = datetime.combine(day, time(hour=17))
        appointments = (
            await db.execute(
                select(Appointment.start_time, Appointment.end_time)
                .where(
                    Appointment.psychologist_id == psychologist_id,
                    Appointment.deleted_at.is_(None),
                    Appointment.status == AppointmentStatus.booked,
                    Appointment.start_time >= start_of_day,
                    Appointment.end_time <= end_of_day,
                )
                .order_by(Appointment.start_time.asc())
            )
        ).all()
        if len(appointments) >= staff.max_appointments_per_day:
            return []

        slots: list[str] = []
        current = start_of_day
        while current < end_of_day:
            next_hour = current + timedelta(hours=1)
            overlap = any(current < row.end_time and next_hour > row.start_time for row in appointments)
            if not overlap:
                slots.append(f"{current.isoformat()} / {next_hour.isoformat()}")
            current = next_hour
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
