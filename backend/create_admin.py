"""
Run from the backend folder with venv active:
    python create_admin.py
"""
import asyncio
from app.core.database import get_db
from app.services.user_service import UserService
from app.schemas.users import UserCreate


async def main():
    async for db in get_db():
        data = UserCreate(
            email="thisismymail014@gmail.com",
            password="PsyUnitAdmin1",
            full_name="SafeSpace Admin",
            user_type="staff",
            is_admin=True,
            staff_id="ADMIN001",
            staff_type="administrator",
        )
        try:
            user = await UserService.create(db, data)
            print(f"✅ Admin created successfully!")
            print(f"   Email:    {user['email']}")
            print(f"   Role:     {user['effective_role']}")
            print(f"   Staff ID: {user['staff_id']}")
        except Exception as e:
            print(f"❌ Failed: {e}")
        break  # only need one db session


if __name__ == "__main__":
    asyncio.run(main())
