from __future__ import annotations

import hmac
import hashlib
from datetime import datetime, time, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.forum_posts import ForumPost
from app.schemas.forum_posts import ForumPostCreate
from app.utils.pagination import paginate


MAX_DAILY_POSTS_PER_STUDENT = 3


def _anonymous_student_key(student_id: str) -> str:
    return hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        student_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _serialize_post(post: ForumPost) -> dict[str, Any]:
    return {
        "id": post.id,
        "content": post.content,
        "created_at": post.created_at,
        "deleted_at": post.deleted_at,
        "delete_reason": post.delete_reason,
    }


class ForumService:
    @staticmethod
    async def list_posts(
        db: AsyncSession,
        *,
        limit: int,
        offset: int,
        include_deleted: bool = False,
        search: str | None = None,
    ) -> dict[str, Any]:
        query = select(ForumPost)

        if not include_deleted:
            query = query.where(ForumPost.deleted_at.is_(None))

        if search and search.strip():
            query = query.where(ForumPost.content.ilike(f"%{search.strip()}%"))

        total = (
            await db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()
        posts = (
            await db.execute(
                query.order_by(ForumPost.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()

        return paginate(
            data=[_serialize_post(post) for post in posts],
            total=total,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    async def create_post(
        db: AsyncSession,
        *,
        payload: ForumPostCreate,
        current_user: dict,
    ) -> dict[str, Any]:
        student_id = current_user.get("student_id")
        if not student_id:
            raise ValueError("Student identity is required")

        encrypted_student_id = _anonymous_student_key(student_id)
        now = datetime.now(timezone.utc)
        day_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)

        daily_count = (
            await db.execute(
                select(func.count(ForumPost.id)).where(
                    ForumPost.encrypted_student_id == encrypted_student_id,
                    ForumPost.created_at >= day_start,
                )
            )
        ).scalar_one()
        if daily_count >= MAX_DAILY_POSTS_PER_STUDENT:
            raise PermissionError("Daily forum posting limit reached")

        post = ForumPost(
            content=payload.content.strip(),
            encrypted_student_id=encrypted_student_id,
        )
        db.add(post)
        await db.commit()
        await db.refresh(post)
        return _serialize_post(post)

    @staticmethod
    async def soft_delete(
        db: AsyncSession,
        *,
        post_id: UUID,
        reason: str,
    ) -> None:
        result = await db.execute(
            update(ForumPost)
            .where(ForumPost.id == post_id, ForumPost.deleted_at.is_(None))
            .values(
                deleted_at=datetime.now(timezone.utc),
                delete_reason=reason.strip(),
            )
        )
        if result.rowcount == 0:
            raise LookupError("Forum post not found")
        await db.commit()
