from datetime import datetime
from typing import Optional, Literal
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "User profile"

    _id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    occupation = Column(String)


## Tables needed in SQL database

# images

#     id
#     original_filename
#     stored_path
#     upload_timestamp
#     width
#     height
#     file_size
#     sha256

# jobs

#     id
#     image_id
#     job_type
#     status
#     created_at
#     started_at
#     finished_at
#     error_message

# phash_results

#     id
#     image_id
#     phash
#     computed_at

# compression_results

#     id
#     image_id
#     algorithm_name
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
