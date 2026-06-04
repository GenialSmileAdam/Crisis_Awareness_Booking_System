from datetime import date, datetime, time, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointments import Appointment, AppointmentStatus
from app.models.psychologist_availability import PsychologistAvailability, PsychologistBusyBlock


def time_ranges_overlap(
    start_a: time | datetime,
    end_a: time | datetime,
    start_b: time | datetime,
    end_b: time | datetime,
) -> bool:
    """Return True when two half-open time ranges overlap."""
    return start_a < end_b and end_a > start_b


async def check_availability_overlap(
    db: AsyncSession,
    psychologist_id: UUID,
    date_value: date,
    start_time: time,
    end_time: time,
    exclude_id: Optional[UUID] = None,
) -> Optional[PsychologistAvailability]:
    """Find a conflicting availability block for the given psychologist and day."""
    query = select(PsychologistAvailability).where(
        PsychologistAvailability.psychologist_id == psychologist_id,
        PsychologistAvailability.date == date_value,
        PsychologistAvailability.start_time < end_time,
        PsychologistAvailability.end_time > start_time,
    )
    if exclude_id is not None:
        query = query.where(PsychologistAvailability.id != exclude_id)

    result = await db.execute(query.limit(1))
    return result.scalar_one_or_none()


async def check_busy_block_conflict(
    db: AsyncSession,
    psychologist_id: UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_id: Optional[UUID] = None,
) -> Optional[PsychologistBusyBlock]:
    """Find a conflicting busy block for the given psychologist."""
    query = select(PsychologistBusyBlock).where(
        PsychologistBusyBlock.psychologist_id == psychologist_id,
        PsychologistBusyBlock.block_start < end_time,
        PsychologistBusyBlock.block_end > start_time,
    )
    if exclude_id is not None:
        query = query.where(PsychologistBusyBlock.id != exclude_id)

    result = await db.execute(query.limit(1))
    return result.scalar_one_or_none()


async def check_availability_conflicts_busy_block(
    db: AsyncSession,
    psychologist_id: UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_availability_id: Optional[UUID] = None,
) -> Optional[PsychologistAvailability]:
    """Find a psychologist availability block that overlaps the given busy interval."""
    query = select(PsychologistAvailability).where(
        PsychologistAvailability.psychologist_id == psychologist_id,
        PsychologistAvailability.date >= start_time.date(),
        PsychologistAvailability.date <= end_time.date(),
    )
    result = await db.execute(query)
    rows = result.scalars().all()

    for row in rows:
        if exclude_availability_id is not None and row.id == exclude_availability_id:
            continue
        availability_start = datetime.combine(row.date, row.start_time, tzinfo=timezone.utc)
        availability_end = datetime.combine(row.date, row.end_time, tzinfo=timezone.utc)
        if time_ranges_overlap(availability_start, availability_end, start_time, end_time):
            return row
    return None


async def check_confirmed_appointment_conflict(
    db: AsyncSession,
    psychologist_id: UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_id: Optional[UUID] = None,
) -> Optional[Appointment]:
    """Find a conflicting confirmed or booked appointment for the given psychologist."""
    conditions = [
        Appointment.psychologist_id == psychologist_id,
        Appointment.status.in_({AppointmentStatus.confirmed, AppointmentStatus.booked}),
        Appointment.deleted_at.is_(None),
        func.tstzrange(Appointment.start_time, Appointment.end_time).op("&&")(
            func.tstzrange(start_time, end_time)
        ),
    ]
    if exclude_id is not None:
        conditions.append(Appointment.id != exclude_id)

    query = select(Appointment).where(and_(*conditions))
    result = await db.execute(query.limit(1))
    return result.scalar_one_or_none()
