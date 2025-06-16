from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from database.base import Base

class VideoProject(Base):
    __tablename__ = "video_project"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())