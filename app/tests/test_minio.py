import os
import boto3
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000', # MinIO API port
    aws_access_key_id='minioadmin',
    aws_secret_access_key='daa-storages',
    config=Config(signature_version='s3v4'), # Required for MinIO
    # region_name='us-east-1' # MinIO usually ignores this but Boto3 requires it
)

# Example: Create a bucket
s3.create_bucket(Bucket='my-test-bucket')

# Example: Upload a file
s3.put_object(Bucket='my-test-bucket', Key='hello.txt', Body='Hello from Boto3!')
print("File uploaded successfully!")
