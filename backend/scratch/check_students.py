import asyncio
import uuid
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.students import Student
from app.models.users import UserRole

async def check_students():
    async with AsyncSessionLocal() as db:
        total = (await db.execute(select(func.count(Student.student_id)))).scalar()
        assigned = (await db.execute(select(func.count(Student.student_id)).where(Student.assigned_psychologist_id.is_not(None)))).scalar()
        print(f"Total students: {total}")
        print(f"Assigned students: {assigned}")
        
        if total > 0:
            sample = (await db.execute(select(Student).limit(5))).scalars().all()
            for s in sample:
                print(f"ID: {s.student_id}, Assigned: {s.assigned_psychologist_id}")

if __name__ == "__main__":
    asyncio.run(check_students())
