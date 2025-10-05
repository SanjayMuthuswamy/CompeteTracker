# backend/models.py

from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import datetime

# --- Configuration ---
Base = declarative_base()
DATABASE_URL = "sqlite:///compintel.db"
engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# --- Database Models ---


class Competitor(Base):
    """
    Table to store information about the RSS/website sources being tracked.
    """
    __tablename__ = 'competitors'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    website = Column(String, nullable=True)
    rss = Column(String, nullable=True)
    description = Column(String, nullable=True)  # ✅ added description
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<Competitor(name='{self.name}')>"

class Article(Base):
    """
    Table to store fetched articles, raw content, AI summary, and status.
    """
    __tablename__ = 'articles'
    
    id = Column(Integer, primary_key=True, index=True)
    competitor = Column(String, index=True, nullable=False)
    url = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    published = Column(DateTime, nullable=True)
    content = Column(Text)
    summary = Column(Text)
    status = Column(String, default='pending', index=True)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('url', name='_article_url_uc'),
    )

    def __repr__(self):
        return f"<Article(title='{self.title[:30]}...', status='{self.status}')>"

# --- Database Initialization ---
def init_db():
    print(f"Initializing database at {DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    print("Database initialization complete.")

if __name__ == '__main__':
    init_db()
