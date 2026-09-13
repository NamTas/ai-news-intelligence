from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime

from database import Base


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    source = Column(String)
    category = Column(String)
    published_at = Column(String)
    saved_at = Column(DateTime, default=datetime.utcnow)


class SummaryHistory(Base):
    __tablename__ = "summary_history"

    id = Column(Integer, primary_key=True, index=True)
    article_title = Column(String)
    article_url = Column(String, nullable=True)
    executive_summary = Column(Text)
    sentiment = Column(String)
    key_insights = Column(Text)  # stored as a JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
