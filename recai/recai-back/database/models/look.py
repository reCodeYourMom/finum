from sqlalchemy import Column, String, ForeignKey
from database.base import Base

class Look(Base):
    __tablename__ = "look"
    id = Column(String, primary_key=True, index=True)
    clone_id = Column(String, ForeignKey("clone.id"), nullable=False)
    video_source_path = Column(String, nullable=False)
    face_path = Column(String, nullable=False)
    decor_context = Column(String, nullable=True)