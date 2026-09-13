import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from dotenv import load_dotenv

load_dotenv()  

import models
import schemas
from database import engine, get_db
from ai_service import generate_ai_summary
from news_service import fetch_live_news

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI News Intelligence Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "AI News Intelligence Platform API is running. Visit /docs for API docs."}


@app.get("/api/news")
def get_news(category: str = "All", query: str = ""):
    """
    Auto-aggregated news - combines GNews API (if a key is set) with live
    RSS feeds (Prothom Alo, Daily Star, BBC, CNN, Al Jazeera). No manual
    article data involved; everything here is fetched live.
    """
    return fetch_live_news(category=category, query=query)


@app.post("/api/summarize", response_model=schemas.SummaryResponse)
def summarize_article(req: schemas.ArticleRequest, db: Session = Depends(get_db)):
    content = req.text or req.url
    if not content:
        raise HTTPException(status_code=400, detail="Provide either 'url' or 'text'.")

    summary_data = generate_ai_summary(content, req.title or "Article Analysis")

    db_history = models.SummaryHistory(
        article_title=summary_data["title"],
        article_url=req.url or "",
        executive_summary=summary_data["executive_summary"],
        sentiment=summary_data["sentiment"],
        key_insights=json.dumps(summary_data["key_insights"]),
    )
    db.add(db_history)
    db.commit()
    db.refresh(db_history)

    summary_data["id"] = db_history.id
    return summary_data


@app.get("/api/summaries", response_model=List[schemas.SummaryHistoryOut])
def get_summary_history(db: Session = Depends(get_db)):
    return (
        db.query(models.SummaryHistory)
        .order_by(models.SummaryHistory.created_at.desc())
        .limit(50)
        .all()
    )


@app.delete("/api/summaries/{summary_id}")
def delete_summary(summary_id: int, db: Session = Depends(get_db)):
    record = db.query(models.SummaryHistory).filter(models.SummaryHistory.id == summary_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Summary not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted successfully"}


@app.delete("/api/summaries")
def clear_summary_history(db: Session = Depends(get_db)):
    db.query(models.SummaryHistory).delete()
    db.commit()
    return {"message": "History cleared"}


@app.get("/api/bookmarks", response_model=List[schemas.BookmarkResponse])
def get_bookmarks(db: Session = Depends(get_db)):
    return db.query(models.Bookmark).all()


@app.post("/api/bookmarks", response_model=schemas.BookmarkResponse)
def add_bookmark(bookmark: schemas.BookmarkCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Bookmark).filter(models.Bookmark.url == bookmark.url).first()
    if existing:
        return existing
    db_bm = models.Bookmark(**bookmark.dict())
    db.add(db_bm)
    db.commit()
    db.refresh(db_bm)
    return db_bm


@app.delete("/api/bookmarks/{bookmark_id}")
def delete_bookmark(bookmark_id: int, db: Session = Depends(get_db)):
    bm = db.query(models.Bookmark).filter(models.Bookmark.id == bookmark_id).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bm)
    db.commit()
    return {"message": "Deleted successfully"}
