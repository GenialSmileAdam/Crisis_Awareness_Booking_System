"""
Development Database Reset Script
⚠️ WARNING: This script PERMANENTLY DELETES all data from the development database.
Only use on development/test databases, NEVER on production.

Usage:
    python reset_dev_db.py
"""

import asyncio
import sys
import os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Setup paths
ROOT = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(ROOT, ".env"))

from app.core.config import settings
from app.models.base import Base

async def reset_database():
    """Drop all tables and recreate schema."""

    # Confirm this is development
    if "prod" in settings.DATABASE_URL.lower() or "production" in settings.DATABASE_URL.lower():
        print("❌ SAFETY CHECK FAILED: This appears to be a production database!")
        print("   Refusing to reset production database.")
        sys.exit(1)

    print("⚠️  WARNING: This will DELETE ALL DATA from the development database")
    print(f"   Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'unknown'}")
    response = input("Type 'yes' to confirm: ")

    if response.lower() != "yes":
        print("Reset cancelled.")
        sys.exit(0)

    # Create engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    try:
        # Drop all tables
        async with engine.begin() as conn:
            print("🗑️  Dropping all tables...")
            await conn.execute(text("DROP SCHEMA public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))
            await conn.commit()

        print("✅ Dropped all tables")

        # Recreate schema
        async with engine.begin() as conn:
            print("🔨 Recreating schema...")
            await conn.run_sync(Base.metadata.create_all)
            await conn.commit()

        print("✅ Database reset complete!")
        print("\n📝 Next steps:")
        print("   1. Run: python seed.py")
        print("   2. Start the server: uvicorn app.main:app --reload")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_database())
