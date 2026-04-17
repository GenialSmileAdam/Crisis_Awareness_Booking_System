import csv
import io
import uuid
from datetime import datetime
from email.utils import parseaddr
from typing import Any

from sqlalchemy import insert, select, update, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.appointments import Appointment
from app.models.crisis_logs import CrisisLog
from app.models.students import Student
from app.models.users import UserRole
from app.models.tables import sessions_table, users_table
from app.schemas.students import StudentUpdate
from app.utils.pagination import paginate



def _paginate_payload(items: list[dict[str, Any]], total: int, limit: int, offset: int) -> dict[str, Any]:
    try:
        return paginate(items, total, limit, offset)
    except TypeError:
        return paginate(data=items, total=total, limit=limit, offset=offset)


def _is_valid_email(email: str) -> bool:
    parsed_name, parsed_email = parseaddr(email)
    if parsed_name or not parsed_email:
        return False
    local_part, separator, domain = parsed_email.partition("@")
    return bool(separator and local_part and domain and "." in domain)


def _normalize_email(email: str | None) -> str | None:
    return email.strip().lower() if email else None


class StudentService:
    @staticmethod
    


    async def _create_user_for_student(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        student_id: str,
        first_name: str,
        last_name: str,
        email: str | None,
        parsed_dob,
        gender: str | None,
        now: datetime,
    ) -> None:
        # Default password for all imported students
        default_password = "ChangeMe123!"
        password_hash = hash_password(default_password)

        await db.execute(
            insert(users_table).values(
                id=user_id,
                email=email or f"{student_id.lower()}@placeholder.local",
                full_name=f"{first_name} {last_name}".strip(),
                date_of_birth=parsed_dob,
                gender=gender,
                role=UserRole.student.value,
                is_admin=False,
                is_active=True,
                password_hash=password_hash,
                created_at=now,
                updated_at=now,
            )
        )

    @staticmethod
    async def search_by_student_id(
        db: AsyncSession,
        query: str,
        limit: int,
        offset: int,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        normalized_query = query.strip()
        if not normalized_query:
            raise ValueError("student_id query is required")

        return await StudentService.get_all(
            db,
            {"student_id_query": normalized_query},
            limit,
            offset,
            current_user=current_user,
        )

    @staticmethod
    async def get_all(
        db: AsyncSession,
        filters: dict[str, Any],
        limit: int,
        offset: int,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        session_count_subquery = (
            select(
                Appointment.student_id.label("student_id"),
                func.count(Appointment.id).label("session_count"),
            )
            .where(Appointment.deleted_at.is_(None))
            .group_by(Appointment.student_id)
            .subquery()
        )
        query = (
            select(
                Student,
                users_table.c.full_name,
                users_table.c.email,
                func.coalesce(session_count_subquery.c.session_count, 0).label("session_count"),
            )
            .join(users_table, users_table.c.id == Student.user_id)
            .outerjoin(session_count_subquery, session_count_subquery.c.student_id == Student.student_id)
            .where(users_table.c.deleted_at.is_(None))
        )
        if filters.get("class_level"):
            query = query.where(Student.class_level == filters["class_level"])
        if filters.get("student_id_query"):
            student_id_query = filters["student_id_query"].strip()
            query = query.where(
                or_(
                    Student.student_id == student_id_query,
                    Student.student_id.ilike(f"%{student_id_query}%"),
                )
            )
        if filters.get("crisis_flag") is not None:
            query = query.where(Student.crisis_flag == filters["crisis_flag"])
        if filters.get("assigned_psychologist_id"):
            query = query.where(Student.assigned_psychologist_id == filters["assigned_psychologist_id"])
        if current_user and current_user.get("role") == "psychologist":
            query = query.where(Student.assigned_psychologist_id == current_user["id"])

        total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        rows = (await db.execute(query.order_by(Student.created_at.desc()).limit(limit).offset(offset))).all()
        data = [
            {
                "student_id": row.Student.student_id,
                "class_level": row.Student.class_level,
                "assigned_psychologist_id": row.Student.assigned_psychologist_id,
                "guidance_counselor": row.Student.guidance_counselor,
                "emergency_contact": row.Student.emergency_contact,
                "emergency_phone": row.Student.emergency_phone,
                "crisis_flag": row.Student.crisis_flag,
                "created_at": row.Student.created_at,
                "updated_at": row.Student.updated_at,
                "full_name": row.full_name,
                "email": row.email,
                "session_count": row.session_count,
            }
            for row in rows
        ]
        return _paginate_payload(data, total, limit, offset)

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        student_id: str,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        session_count_subquery = (
            select(func.count(Appointment.id))
            .where(Appointment.student_id == student_id, Appointment.deleted_at.is_(None))
            .scalar_subquery()
        )
        query = (
            select(
                Student,
                users_table.c.full_name,
                users_table.c.email,
                func.coalesce(session_count_subquery, 0).label("session_count"),
            )
            .join(users_table, users_table.c.id == Student.user_id)
            .where(Student.student_id == student_id, users_table.c.deleted_at.is_(None))
        )
        if current_user and current_user.get("role") == "psychologist":
            query = query.where(Student.assigned_psychologist_id == current_user["id"])
        row = (await db.execute(query)).first()
        if not row:
            raise LookupError("Student not found")
        return {
            "student_id": row.Student.student_id,
            "class_level": row.Student.class_level,
            "assigned_psychologist_id": row.Student.assigned_psychologist_id,
            "guidance_counselor": row.Student.guidance_counselor,
            "emergency_contact": row.Student.emergency_contact,
            "emergency_phone": row.Student.emergency_phone,
            "crisis_flag": row.Student.crisis_flag,
            "created_at": row.Student.created_at,
            "updated_at": row.Student.updated_at,
            "full_name": row.full_name,
            "email": row.email,
            "session_count": row.session_count,
        }

    @staticmethod
    async def update(
        db: AsyncSession,
        student_id: str,
        data: StudentUpdate,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        await StudentService.get_by_id(db, student_id, current_user=current_user)
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            return await StudentService.get_by_id(db, student_id, current_user=current_user)
        payload["updated_at"] = datetime.utcnow()
        await db.execute(update(Student).where(Student.student_id == student_id).values(**payload))
        await db.commit()
        return await StudentService.get_by_id(db, student_id, current_user=current_user)

    @staticmethod
    async def soft_delete(db: AsyncSession, student_id: str) -> None:
        student_user_id = (
            await db.execute(select(Student.user_id).where(Student.student_id == student_id))
        ).scalar_one_or_none()
        if student_user_id is None:
            raise LookupError("Student not found")
        result = await db.execute(
            update(users_table)
            .where(users_table.c.id == student_user_id, users_table.c.deleted_at.is_(None))
            .values(deleted_at=datetime.utcnow(), updated_at=datetime.utcnow())
        )
        if result.rowcount == 0:
            raise LookupError("Student not found")
        await db.commit()

    @staticmethod
    async def get_sessions(
        db: AsyncSession,
        student_id: str,
        limit: int,
        offset: int,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        await StudentService.get_by_id(db, student_id, current_user=current_user)
        query = (
            select(
                Appointment.id,
                Appointment.start_time,
                Appointment.end_time,
                Appointment.status,
                Appointment.is_crisis,
                Appointment.booking_source,
                sessions_table.c.summary.label("session_summary"),
            )
            .outerjoin(sessions_table, sessions_table.c.appointment_id == Appointment.id)
            .where(Appointment.student_id == student_id, Appointment.deleted_at.is_(None))
            .order_by(Appointment.start_time.desc())
        )
        total = (
            await db.execute(
                select(func.count()).select_from(
                    select(Appointment.id)
                    .where(Appointment.student_id == student_id, Appointment.deleted_at.is_(None))
                    .subquery()
                )
            )
        ).scalar_one()
        rows = (await db.execute(query.limit(limit).offset(offset))).all()
        data = [
            {
                "appointment_id": row.id,
                "start_time": row.start_time,
                "end_time": row.end_time,
                "status": row.status,
                "is_crisis": row.is_crisis,
                "booking_source": row.booking_source,
                "session_summary": row.session_summary,
            }
            for row in rows
        ]
        return _paginate_payload(data, total, limit, offset)

    @staticmethod
    async def get_crisis_logs(
        db: AsyncSession,
        student_id: str,
        current_user: dict | None = None,
    ) -> list[dict[str, Any]]:
        await StudentService.get_by_id(db, student_id, current_user=current_user)
        rows = (
            await db.execute(
                select(CrisisLog).where(CrisisLog.student_id == student_id).order_by(CrisisLog.created_at.desc())
            )
        ).scalars().all()
        return [
            {
                "id": row.id,
                "appointment_id": row.appointment_id,
                "student_id": row.student_id,
                "severity_level": row.severity_level,
                "action_taken": row.action_taken,
                "alert_sent_at": row.alert_sent_at,
                "resolved": row.resolved,
                "resolved_at": row.resolved_at,
                "created_at": row.created_at,
            }
            for row in rows
        ]

    @staticmethod
    async def bulk_import_csv(db: AsyncSession, file_contents: bytes) -> dict[str, Any]:
        if len(file_contents) > 5 * 1024 * 1024:
            raise ValueError("CSV file exceeds 5 MB limit")

        reader = csv.DictReader(io.StringIO(file_contents.decode("utf-8-sig")))
        required_columns = {"student_id", "first_name", "last_name"}
        if not reader.fieldnames or not required_columns.issubset(set(reader.fieldnames)):
            raise ValueError("CSV is missing required columns")

        rows = list(reader)
        if len(rows) > 2000:
            raise ValueError("CSV exceeds 2,000 row limit")

        errors: list[dict[str, Any]] = []
        inserted = 0
        skipped = 0
        seen_student_ids: set[str] = set()
        seen_emails: set[str] = set()
        student_ids = [row.get("student_id", "").strip() for row in rows if row.get("student_id")]
        csv_emails = [
            normalized_email
            for row in rows
            if (normalized_email := _normalize_email(row.get("email")))
        ]
        existing_ids = (
            set((await db.execute(select(Student.student_id).where(Student.student_id.in_(student_ids)))).scalars().all())
            if student_ids
            else set()
        )
        existing_emails = (
            set(
                (
                    await db.execute(
                        select(func.lower(users_table.c.email)).where(
                            func.lower(users_table.c.email).in_(csv_emails)
                        )
                    )
                ).scalars().all()
            )
            if csv_emails
            else set()
        )

        for index, row in enumerate(rows, start=2):
            student_id_value = (row.get("student_id") or "").strip()
            first_name = (row.get("first_name") or "").strip()
            last_name = (row.get("last_name") or "").strip()
            if not student_id_value or not first_name or not last_name:
                skipped += 1
                errors.append({"row": index, "reason": "student_id, first_name, and last_name are required"})
                continue
            if student_id_value in seen_student_ids:
                skipped += 1
                errors.append({"row": index, "reason": "Duplicate student_id found in CSV"})
                continue
            if student_id_value in existing_ids:
                skipped += 1
                errors.append({"row": index, "reason": "student_id already exists"})
                continue
            seen_student_ids.add(student_id_value)

            email = _normalize_email((row.get("email") or "").strip() or None)
            if email and not _is_valid_email(email):
                skipped += 1
                errors.append({"row": index, "reason": "Invalid email format"})
                continue
            if email and email in seen_emails:
                skipped += 1
                errors.append({"row": index, "reason": "Duplicate email found in CSV"})
                continue
            if email and email in existing_emails:
                skipped += 1
                errors.append({"row": index, "reason": "email already exists"})
                continue
            if email:
                seen_emails.add(email)

            date_of_birth = (row.get("date_of_birth") or "").strip() or None
            parsed_dob = None
            if date_of_birth:
                try:
                    parsed_dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
                except ValueError:
                    skipped += 1
                    errors.append({"row": index, "reason": "date_of_birth must be YYYY-MM-DD"})
                    continue

            user_id = uuid.uuid4()
            now = datetime.utcnow()
            await StudentService._create_user_for_student(
                db,
                user_id=user_id,
                student_id=student_id_value,
                first_name=first_name,
                last_name=last_name,
                email=email,
                parsed_dob=parsed_dob,
                gender=(row.get("gender") or "").strip() or None,
                now=now,
            )
            await db.execute(
                insert(Student).values(
                    student_id=student_id_value,
                    user_id=user_id,
                    class_level=(row.get("class_level") or "").strip() or None,
                    guidance_counselor=None,
                    emergency_contact=(row.get("emergency_contact") or "").strip() or None,
                    emergency_phone=(row.get("emergency_phone") or "").strip() or None,
                    crisis_flag=False,
                    created_at=now,
                    updated_at=now,
                )
            )
            inserted += 1

        await db.commit()
        return {"inserted": inserted, "skipped": skipped, "errors": errors}

