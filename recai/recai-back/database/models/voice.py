# database/models/voice.py

from sqlalchemy import Column, String, ForeignKey, JSON
from database.base import Base

class Voice(Base):
    __tablename__ = "voice"
    id = Column(String, primary_key=True, index=True)
    clone_id = Column(String, ForeignKey("clone.id"), nullable=False)
    language = Column(String, nullable=False)
    emotions = Column(JSON, nullable=False)  # stocke liste d’émotions
