from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ArticleRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    title: Optional[str] = None


class BookmarkCreate(BaseModel):
    title: str
    url: str
    source: str
    category: str
    published_at: str


class BookmarkResponse(BookmarkCreate):
    id: int
    saved_at: datetime

    class Config:
        from_attributes = True


class SummaryHistoryOut(BaseModel):
    id: int
    article_title: str
    article_url: Optional[str]
    executive_summary: str
    sentiment: str
    created_at: datetime

    class Config:
        from_attributes = True


class SummaryResponse(BaseModel):
    id: Optional[int] = None
    title: str
    executive_summary: str
    key_insights: List[str]
    sentiment: str
    impact_analysis: str
    entities: List[str]
    tags: List[str]
    created_at: Optional[datetime] = None
