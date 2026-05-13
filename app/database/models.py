from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "User profile"

    _id = Column(String, primary_key=True)
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


class CompressionResult(Base):
    __tablename__ = "compression_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_id = Column(String, ForeignKey("images.image_id"), nullable=False, index=True)
    original_size = Column(Integer, nullable=False)
    compressed_size = Column(Integer, nullable=False)
    compression_ratio = Column(Float, nullable=False)
    metadata_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


## Tables needed in SQL database

# images

#     image_id
#     filename
#     stored_path
#     upload_timestamp
#     width
#     height
#     file_size
#     sha256

# details of the image

#     id
#     image_id
#     job_type
#     status
#     created_at
#     error_message

# phash_results

#     id
#     image_id
#     phash
#     computed_at

# compression_results

#     id
#     image_id
#     original_size
#     compressed_size
#     compression_ratio
#     metadata_json

# similarity_results

#     id
#     source_image_id
#     matched_image_id
#     hamming_distance
#     created_at
