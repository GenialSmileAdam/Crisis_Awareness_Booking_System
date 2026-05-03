from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.consent import Consent
from app.schemas.consent import ConsentResponse, ConsentUpdate
from app.utils.response import success


router = APIRouter()


@router.post("")
async def upsert_consent(
    payload: ConsentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if payload.monitoring_enabled is None:
        raise HTTPException(status_code=400, detail="monitoring_enabled is required")

    student_id = current_user.get("student_id")
    result = await db.execute(select(Consent).where(Consent.student_id == student_id))
    consent = result.scalar_one_or_none()

    if consent is None:
        consent = Consent(
            student_id=student_id,
            monitoring_enabled=payload.monitoring_enabled,
        )
        db.add(consent)
    else:
        consent.monitoring_enabled = payload.monitoring_enabled

    await db.commit()
    await db.refresh(consent)

    response_data = ConsentResponse.model_validate(consent).model_dump(mode="json")
    return success("Consent updated successfully", response_data)


@router.get("/{student_id}")
async def get_consent(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in {"admin", "psychologist", "student"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if role == "student" and current_user.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(select(Consent).where(Consent.student_id == student_id))
    consent = result.scalar_one_or_none()
    if consent is None:
        raise HTTPException(status_code=404, detail="Consent record not found")

    response_data = ConsentResponse.model_validate(consent).model_dump(mode="json")
    return success("Consent retrieved successfully", response_data)
