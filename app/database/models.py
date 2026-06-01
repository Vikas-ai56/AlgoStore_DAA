from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "user_profiles"

    user_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    occupation = Column(String)


class Image(Base):
    __tablename__ = "images"

    image_id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    upload_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256 = Column(String, nullable=False, unique=True, index=True)

    compression_results = relationship("CompressionResult", back_populates="image", cascade="all, delete-orphan")
    phash_results = relationship("PhashResult", back_populates="image", uselist=False, cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="image", cascade="all, delete-orphan")


class CompressionResult(Base):
    __tablename__ = "compression_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_id = Column(String, ForeignKey("images.image_id"), nullable=False, index=True)
    original_size = Column(Integer, nullable=False)
    compressed_size = Column(Integer, nullable=False)
    compression_ratio = Column(Float, nullable=False)
    metadata_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    image = relationship("Image", back_populates="compression_results")


class PhashResult(Base):
    __tablename__ = "phash_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_id = Column(String, ForeignKey("images.image_id"), nullable=False, unique=True, index=True)
    phash = Column(String, nullable=False, index=True)
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    image = relationship("Image", back_populates="phash_results")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_id = Column(String, ForeignKey("images.image_id"), nullable=True, index=True)
    celery_task_id = Column(String, nullable=True, index=True)
    job_type = Column(String, nullable=False)  # compression, phash, similarity
    status = Column(String, nullable=False, default="PENDING")  # PENDING, STARTED, SUCCESS, FAILURE
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    image = relationship("Image", back_populates="jobs")


class SimilarityResult(Base):
    __tablename__ = "similarity_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_image_id = Column(String, ForeignKey("images.image_id"), nullable=False, index=True)
    matched_image_id = Column(String, ForeignKey("images.image_id"), nullable=False, index=True)
    hamming_distance = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
