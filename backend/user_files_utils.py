import boto3
import os

# Set up AWS credentials and S3 resource
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
REGION_NAME = "ca-central-1"  # e.g., 'us-east-1'

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name=REGION_NAME
)

bucket_name = "jasmintechs-tutorion" 