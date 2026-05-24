import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.tables import users_table
from app.models.users import UserRole

async def check_psychologists():
    async with AsyncSessionLocal() as db:
        query = select(users_table).where(users_table.c.role == UserRole.psychologist.value)
        rows = (await db.execute(query)).all()
        for r in rows:
            print(f"Name: {r.full_name}, ID: {r.id}, Email: {r.email}")

if __name__ == "__main__":
    asyncio.run(check_psychologists())
