"""
FastAPI dependency providers.

Usage in route handlers:
    from app.api.deps import get_db
    from sqlalchemy.orm import Session
    from fastapi import Depends

    @router.get("/example")
    def example(db: Session = Depends(get_db)):
        ...
"""

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.database.connection import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Yield a SQLAlchemy session and guarantee it is closed after the request,
    even if an exception is raised.  FastAPI calls the cleanup automatically
    because this is a generator dependency.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
