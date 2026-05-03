import asyncio
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.students import Student
from app.models.tables import users_table

async def check_students_and_users():
    async with AsyncSessionLocal() as db:
        query = select(Student, users_table).join(users_table, users_table.c.id == Student.user_id)
        rows = (await db.execute(query)).all()
        print(f"Total students with user record: {len(rows)}")
        
        query_active = query.where(users_table.c.deleted_at.is_(None))
        rows_active = (await db.execute(query_active)).all()
        print(f"Total active students with user record: {len(rows_active)}")

        if len(rows) > 0:
            for r in rows[:3]:
                print(f"Student: {r.Student.student_id}, User Name: {r.full_name}, Deleted At: {r.deleted_at}")

if __name__ == "__main__":
    asyncio.run(check_students_and_users())
