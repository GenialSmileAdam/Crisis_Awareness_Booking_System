from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import insert, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.psychologist_availability import PsychologistAvailability, PsychologistBusyBlock, PsychologistWeeklySchedule
from app.models.staff import Staff, StaffType
from app.models.users import User, UserRole
from app.models.tables import users_table
from app.schemas.staff import StaffCreate, StaffUpdate
from app.utils.pagination import paginate
from app.core import security


def _paginate_payload(items: list[dict[str, Any]], total: int, limit: int, offset: int) -> dict[str, Any]:
    try:
        return paginate(items, total, limit, offset)
    except TypeError:
        return paginate(data=items, total=total, limit=limit, offset=offset)


class StaffService:
    _psychologists_cache: dict[str, Any] = {"expires_at": None, "data": None}

    @classmethod
    async def create(cls, db: AsyncSession, data: StaffCreate) -> dict[str, Any]:
        existing_email = (
            await db.execute(
                select(users_table.c.id).where(
                    users_table.c.email == data.email,
                    users_table.c.deleted_at.is_(None),
                )
            )
        ).first()
        if existing_email:
            raise FileExistsError("Email already exists")

        existing_staff = (await db.execute(select(Staff).where(Staff.staff_id == data.staff_id))).scalar_one_or_none()
        if existing_staff:
            raise FileExistsError("Staff ID already exists")

        user = User(
            email=data.email,
            password_hash=security.hash_password(data.password),
            full_name=data.full_name,
            role=UserRole.staff,
            is_admin=data.is_admin,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        payload = data.model_dump(exclude={"email", "password", "full_name", "is_admin"})
        payload["user_id"] = user.id
        payload["created_at"] = datetime.now(timezone.utc)
        payload["updated_at"] = datetime.now(timezone.utc)
        await db.execute(insert(Staff).values(**payload))
        await db.commit()
        cls._psychologists_cache = {"expires_at": None, "data": None}

        if data.staff_type == StaffType.psychologist:
            await cls._seed_default_availability(db, user.id)

        return await cls.get_by_id(db, data.staff_id)

    @staticmethod
    async def _seed_default_availability(db: AsyncSession, psychologist_id: any) -> None:
        """Auto-generate Mon–Fri 09:00–17:00 weekly schedule + 26 weeks of date blocks."""
        start = time(9, 0)
        end = time(17, 0)
        workdays = range(5)  # 0=Mon … 4=Fri

        for dow in workdays:
            db.add(PsychologistWeeklySchedule(
                psychologist_id=psychologist_id,
                day_of_week=dow,
                start_time=start,
                end_time=end,
            ))

        today = date.today()
        for week in range(26):
            for dow in workdays:
                days_ahead = dow - today.weekday()
                if days_ahead < 0:
                    days_ahead += 7
                target = today + timedelta(days=days_ahead + week * 7)
                db.add(PsychologistAvailability(
                    psychologist_id=psychologist_id,
                    date=target,
                    start_time=start,
                    end_time=end,
                ))

        await db.commit()

    @staticmethod
    async def get_all(db: AsyncSession, filters: dict[str, Any], limit: int, offset: int) -> dict[str, Any]:
        query = (
            select(Staff, users_table.c.full_name, users_table.c.email, users_table.c.is_admin)
            .join(users_table, users_table.c.id == Staff.user_id)
            .where(users_table.c.deleted_at.is_(None))
        )
        if filters.get("staff_type"):
            query = query.where(Staff.staff_type == filters["staff_type"])
        if filters.get("department"):
            query = query.where(Staff.department == filters["department"])

        total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        rows = (await db.execute(query.order_by(Staff.created_at.desc()).limit(limit).offset(offset))).all()
        data = [
            {
                "user_id": row.Staff.user_id,
                "staff_id": row.Staff.staff_id,
                "staff_type": row.Staff.staff_type,
                "department": row.Staff.department,
                "hire_date": row.Staff.hire_date,
                "specialization": row.Staff.specialization,
                "max_appointments_per_day": row.Staff.max_appointments_per_day,
                "session_duration_minutes": row.Staff.session_duration_minutes,
                "is_admin": row.is_admin,
                "created_at": row.Staff.created_at,
                "updated_at": row.Staff.updated_at,
                "full_name": row.full_name,
                "email": row.email,
            }
            for row in rows
        ]
        return _paginate_payload(data, total, limit, offset)

    @classmethod
    async def get_psychologists(cls, db: AsyncSession) -> list[dict[str, Any]]:
        if cls._psychologists_cache["expires_at"] and cls._psychologists_cache["expires_at"] > datetime.now(timezone.utc):
            return cls._psychologists_cache["data"]

        rows = (
            await db.execute(
                select(Staff, users_table.c.full_name, users_table.c.email, users_table.c.is_admin)
                .join(users_table, users_table.c.id == Staff.user_id)
                .where(
                    Staff.staff_type == StaffType.psychologist,
                    users_table.c.is_active.is_(True),
                    users_table.c.deleted_at.is_(None),
                )
                .order_by(users_table.c.full_name.asc())
            )
        ).all()

        # Compute real-time availability for each psychologist
        now = datetime.now(timezone.utc)
        now_time = now.time()
        today_dow = now.weekday()  # 0=Mon…6=Sun
        psych_ids = [row.Staff.user_id for row in rows]

        avail_by_id: dict = {}
        weekly_by_id: dict = {}
        busy_ids: set = set()
        if psych_ids:
            avail_rows = (
                await db.execute(
                    select(PsychologistAvailability).where(
                        PsychologistAvailability.psychologist_id.in_(psych_ids),
                        PsychologistAvailability.date == now.date(),
                    )
                )
            ).scalars().all()
            for a in avail_rows:
                avail_by_id.setdefault(a.psychologist_id, []).append(a)

            weekly_rows = (
                await db.execute(
                    select(PsychologistWeeklySchedule).where(
                        PsychologistWeeklySchedule.psychologist_id.in_(psych_ids),
                        PsychologistWeeklySchedule.day_of_week == today_dow,
                    )
                )
            ).scalars().all()
            for w in weekly_rows:
                weekly_by_id.setdefault(w.psychologist_id, []).append(w)

            busy_rows = (
                await db.execute(
                    select(PsychologistBusyBlock.psychologist_id).where(
                        PsychologistBusyBlock.psychologist_id.in_(psych_ids),
                        PsychologistBusyBlock.block_start <= now,
                        PsychologistBusyBlock.block_end >= now,
                    )
                )
            ).all()
            busy_ids = {r.psychologist_id for r in busy_rows}

        data = []
        for row in rows:
            psych_id = row.Staff.user_id
            avail_blocks = avail_by_id.get(psych_id, [])
            weekly_blocks = weekly_by_id.get(psych_id, [])
            in_date_block = any(block.start_time <= now_time < block.end_time for block in avail_blocks)
            in_weekly_block = any(block.start_time <= now_time < block.end_time for block in weekly_blocks)
            is_available_now = (in_date_block or in_weekly_block) and psych_id not in busy_ids
            data.append({
                "user_id": psych_id,
                "staff_id": row.Staff.staff_id,
                "staff_type": row.Staff.staff_type,
                "department": row.Staff.department,
                "hire_date": row.Staff.hire_date,
                "specialization": row.Staff.specialization,
                "max_appointments_per_day": row.Staff.max_appointments_per_day,
                "is_admin": row.is_admin,
                "created_at": row.Staff.created_at,
                "updated_at": row.Staff.updated_at,
                "full_name": row.full_name,
                "email": row.email,
                "is_available_now": is_available_now,
            })

        cls._psychologists_cache = {
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=1),
            "data": data,
        }
        return data

    @staticmethod
    async def get_by_id(db: AsyncSession, staff_id: str) -> dict[str, Any]:
        row = (
            await db.execute(
                select(Staff, users_table.c.full_name, users_table.c.email, users_table.c.is_admin)
                .join(users_table, users_table.c.id == Staff.user_id)
                .where(Staff.staff_id == staff_id, users_table.c.deleted_at.is_(None))
            )
        ).first()
        if not row:
            raise LookupError("Staff member not found")
        return {
            "user_id": row.Staff.user_id,
            "staff_id": row.Staff.staff_id,
            "staff_type": row.Staff.staff_type,
            "department": row.Staff.department,
            "hire_date": row.Staff.hire_date,
            "specialization": row.Staff.specialization,
            "max_appointments_per_day": row.Staff.max_appointments_per_day,
            "session_duration_minutes": row.Staff.session_duration_minutes,
            "is_admin": row.is_admin,
            "created_at": row.Staff.created_at,
            "updated_at": row.Staff.updated_at,
            "full_name": row.full_name,
            "email": row.email,
        }

    @classmethod
    async def update(cls, db: AsyncSession, staff_id: str, data: StaffUpdate) -> dict[str, Any]:
        await cls.get_by_id(db, staff_id)
        payload = data.model_dump(exclude_unset=True)
        admin_flag = payload.pop("is_admin", None)
        if not payload:
            if admin_flag is None:
                return await cls.get_by_id(db, staff_id)
        payload["updated_at"] = datetime.now(timezone.utc)
        if payload:
            await db.execute(update(Staff).where(Staff.staff_id == staff_id).values(**payload))
        if admin_flag is not None:
            staff_user_id = (
                await db.execute(select(Staff.user_id).where(Staff.staff_id == staff_id))
            ).scalar_one()
            await db.execute(
                update(users_table).where(users_table.c.id == staff_user_id).values(
                    is_admin=admin_flag,
                    updated_at=datetime.now(timezone.utc),
                )
            )
        await db.commit()
        cls._psychologists_cache = {"expires_at": None, "data": None}
        return await cls.get_by_id(db, staff_id)

    @staticmethod
    async def soft_delete(db: AsyncSession, staff_id: str) -> None:
        staff_user_id = (
            await db.execute(select(Staff.user_id).where(Staff.staff_id == staff_id))
        ).scalar_one_or_none()
        if staff_user_id is None:
            raise LookupError("Staff member not found")
        result = await db.execute(
            update(users_table)
            .where(users_table.c.id == staff_user_id, users_table.c.deleted_at.is_(None))
            .values(deleted_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
        )
        if result.rowcount == 0:
            raise LookupError("Staff member not found")
        await db.commit()
