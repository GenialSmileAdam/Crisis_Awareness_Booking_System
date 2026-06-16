import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from app.main import app
from app.core.database import get_db
from app.core.config import settings

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def db_session():
    """
    Yields an AsyncSession that runs inside a transaction and rolls back
    at the end of each test. The engine is created dynamically within the
    current test's event loop to avoid cross-loop connection issues.
    """
    test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    async with test_engine.connect() as conn:
        trans = await conn.begin()
        async with AsyncSession(bind=conn, expire_on_commit=False) as session:
            yield session
        await trans.rollback()
        
    await test_engine.dispose()

@pytest.fixture
async def client(db_session):
    """
    FastAPI AsyncClient configured to override 'get_db' with our rollback-only db_session.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
