from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import insert, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

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
        payload["created_at"] = datetime.utcnow()
        payload["updated_at"] = datetime.utcnow()
        await db.execute(insert(Staff).values(**payload))
        await db.commit()
        cls._psychologists_cache = {"expires_at": None, "data": None}
        return await cls.get_by_id(db, data.staff_id)

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
        if cls._psychologists_cache["expires_at"] and cls._psychologists_cache["expires_at"] > datetime.utcnow():
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
        data = [
            {
                "user_id": row.Staff.user_id,
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
            }
            for row in rows
        ]
        cls._psychologists_cache = {
            "expires_at": datetime.utcnow() + timedelta(minutes=10),
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
        payload["updated_at"] = datetime.utcnow()
        if payload:
            await db.execute(update(Staff).where(Staff.staff_id == staff_id).values(**payload))
        if admin_flag is not None:
            staff_user_id = (
                await db.execute(select(Staff.user_id).where(Staff.staff_id == staff_id))
            ).scalar_one()
            await db.execute(
                update(users_table).where(users_table.c.id == staff_user_id).values(
                    is_admin=admin_flag,
                    updated_at=datetime.utcnow(),
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
            .values(deleted_at=datetime.utcnow(), updated_at=datetime.utcnow())
        )
        if result.rowcount == 0:
            raise LookupError("Staff member not found")
        await db.commit()
