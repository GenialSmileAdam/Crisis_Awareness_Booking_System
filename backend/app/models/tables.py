import uuid

from sqlalchemy import Column, DateTime, Table, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.base import Base
from app.models.users import User
from app.models.session import Session

metadata = Base.metadata

users_table = User.__table__
sessions_table = Session.__table__
