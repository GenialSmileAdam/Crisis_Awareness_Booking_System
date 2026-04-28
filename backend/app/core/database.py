from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
from app.core.config import settings

import app.models  # noqa: F401


# ── Use settings from config (already validates env vars) ──
DATABASE_URL = settings.DATABASE_URL

print("DB =", DATABASE_URL)
print("RAW DB URL:", repr(DATABASE_URL))

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing")

assert DATABASE_URL is not None, "DATABASE_URL not loaded!"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session