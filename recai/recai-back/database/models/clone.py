from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from database.base import Base

class Clone(Base):
    __tablename__ = "clone"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())