import boto3
import json
import io
# import faiss  # Comment out the direct import
import tempfile
from datetime import datetime
import os

from botocore.exceptions import ClientError

# Try to import faiss, make it optional
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    print("Warning: FAISS not available. Vector index functionality will be disabled.")
    FAISS_AVAILABLE = False
    faiss = None


# Set up AWS credentials and S3 resource
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
REGION_NAME = "ca-central-1"
S3_BUCKET_NAME = "jasmintechs-tutorion"

s3_client = boto3.client(
    's3',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name=REGION_NAME
)


def get_user_s3_folder(username):
    """
    Get the S3 folder for a user.
    :param username: Username of the user
    :return: S3 folder for the user
    """
    return f"user_data/{username}/"


def get_course_s3_folder(username, coursename):
    """
    Get the S3 folder for a course.
    :param username: Username of the user
    :param coursename: Name of the course
    :return: S3 folder for the course
    """
    return f"user_data/{username}/{coursename}/"


def get_s3_file_path(username, coursename, filename):
    """
    Get the S3 file path for a course material file uploaded by a user.
    :param username: Username of the user
    :param coursename: ID (UUID) of the course
    :param filename: Name of the file
    :return: S3 file path within the course_materials subfolder
    """

    return f"user_data/{username}/{coursename}/{filename}"

def get_s3_course_materials_path(username, course_id, filename):
    """
    Get the S3 path for course materials.
    :param username: Username of the user
    :param course_id: ID (UUID) of the course
    :return: S3 path for course materials
    """
    return f"user_data/{username}/{course_id}/course_materials/{filename}"

def get_reverse_mapping_s3_path():
    """Returns the S3 key for storing the assistant reverse lookup table."""
    return "user_data/assistant_reverse_mapping.json"


def upload_file_to_s3(file, bucket_name, s3_key):
    """
    Upload a file to S3 bucket.
    :param file: File to upload
    :param bucket_name: Name of the S3 bucket
    :param s3_key: Key under which the file will be saved in S3
    :return: True if successful, False otherwise
    """
    try:
        # Upload file
        response = s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file,
            ContentType=file.content_type  # Preserve the original content type
        )
        print(f"File uploaded successfully to {bucket_name}/{s3_key}")
        return True
    except Exception as e:
        print(f"Error uploading file: {e}")
        return False


def list_objects_in_folder(bucket_name, prefix):
    """
    List all objects in an S3 folder/path.
    :param bucket_name: Name of the S3 bucket
    :param prefix: Folder path prefix to list objects from
    :return: List of object keys or empty list on error
    """
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket_name, Prefix=prefix)

        objects = []
        for page in page_iterator:
            if 'Contents' in page:
                objects.extend(page['Contents'])
        return objects
    except Exception as e:
        print(f"Error listing objects in {bucket_name}/{prefix}: {e}")
        return []


def read_text_file_from_s3(bucket_name, key):
    """
    Read contents of a text file from S3 without downloading.
    :param bucket_name: Name of the S3 bucket
    :param key: Full path to the file in S3
    :return: File content as string or None on error
    """
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        return response['Body'].read().decode('utf-8')
    except Exception as e:
        print(f"Error reading file {key}: {e}")
        return None


def delete_file_from_s3(bucket_name, s3_key):
    """
    Delete a file from S3 bucket.
    :param bucket_name: Name of the S3 bucket
    :param s3_key: Key of the file to delete in S3
    :return: True if successful, False otherwise
    """
    try:
        # Delete file
        response = s3_client.delete_object(
            Bucket=bucket_name,
            Key=s3_key
        )
        print(f"File deleted successfully from {bucket_name}/{s3_key}")
        return True
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False


def delete_folder_from_s3(bucket_name, s3_key):
    """
    Delete a folder and all its contents from S3 bucket.
    :param bucket_name: Name of the S3 bucket
    :param s3_key: Key of the folder to delete in S3
    :return: True if successful, False otherwise
    """
    try:
        # List all objects in the folder
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=s3_key
        )

        # Extract keys of all objects in the folder
        keys = [{'Key': obj['Key']} for obj in response['Contents']]

        # Delete all objects in the folder
        response = s3_client.delete_objects(
            Bucket=bucket_name,
            Delete={
                'Objects': keys
            }
        )
        print(f"Folder deleted successfully from {bucket_name}/{s3_key}")
        return True
    except Exception as e:
        print(f"Error deleting folder: {e}")
        return False


def upload_json_to_s3(json_data, bucket_name, s3_key):
    """
    Upload a JSON object to S3 bucket.
    :param json_data: JSON object to upload
    :param bucket_name: Name of the S3 bucket
    :param s3_key: Key under which the JSON object will be saved in S3
    :return: True if successful, False otherwise
    """
    try:
        json_string = json.dumps(json_data, indent=4)

        # Upload JSON object
        response = s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=json_string.encode('utf-8'),  # Convert to bytes
            ContentType='application/json'
        )
        print(f"JSON object uploaded successfully to {bucket_name}/{s3_key}")
        return True
    except ClientError as e:
        print(f"Error uploading JSON: {e}")
        return False
    except Exception as e:
        print(f"General error uploading JSON: {e}")
        return False


def upload_faiss_index_to_s3(index, bucket_name, s3_key):
    """
    Upload a Faiss index to S3 bucket using in-memory FAISS serialization.
    :param index: Faiss index to upload
    :param bucket_name: Name of the S3 bucket
    :param s3_key: Key under which the Faiss index will be saved in S3
    :return: True if successful, False otherwise
    """
    if not FAISS_AVAILABLE:
        print("Error: FAISS is not available. Cannot upload FAISS index.")
        return False
        
    try:
        # Serialize the FAISS index to memory
        index_binary = faiss.serialize_index(index)

        # Convert numpy array to bytes
        index_bytes = index_binary.tobytes()

        # Upload serialized FAISS index to S3
        response = s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=index_bytes,
            ContentType='application/octet-stream'
        )
        print(f"FAISS index uploaded successfully to {bucket_name}/{s3_key}")
        return True
    except Exception as e:
        print(f"Error uploading FAISS index: {e}")
        return False


def get_s3_user_courses_info(username):
    """
    Get the course information for a user from S3.
    :param username: Username of the user
    :return: List of course information dictionaries
    """
    try:
        # Get the user's S3 folder
        user_folder = get_user_s3_folder(username)

        # List all objects in the user's folder
        response = s3_client.list_objects_v2(
            Bucket='jasmintechs-tutorion',
            Prefix=user_folder
        )

        # Extract course information from the response
        courses_info = []
        if 'Contents' in response:
            for obj in response['Contents']:
                key = obj['Key']
                if key.endswith('course_info.json'):
                    # Get the course information JSON object
                    course_info = s3_client.get_object(
                        Bucket='jasmintechs-tutorion',
                        Key=key
                    )
                    course_info_json = json.load(course_info['Body'])
                    courses_info.append(course_info_json)
        print(f"User courses info from S3: {courses_info}")
        return courses_info
    except Exception as e:
        print(f"Error getting user courses info from S3: {e}")
        return []


def read_binary_from_s3(bucket_name, key):
    """Read binary data from S3 without temp files"""
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        return response['Body'].read()
    except Exception as e:
        print(f"Error reading binary from {bucket_name}/{key}: {e}")
        return None


def get_json_from_s3(bucket_name, key):
    """Read JSON data from S3"""
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        return json.load(response['Body'])
    except Exception as e:
        print(f"Error reading JSON from {bucket_name}/{key}: {e}")
        return None


def get_assistant_s3_path(username: str) -> str:
    """
    Returns the S3 key for storing a user's assistant data, e.g.:
      user_data/<username>/assistant.json
    """
    return f"user_data/{username}/assistant.json"


def load_user_assistant_from_s3(username: str) -> dict:
    """
    Loads the user's assistant info from S3 (JSON).
    Returns {} if not found.
    """
    s3_key = get_assistant_s3_path(username)
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        content = response["Body"].read().decode("utf-8")
        return json.loads(content)
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return {}
        raise e  # re-raise if it's some other error


def save_user_assistant_to_s3(username: str, course_id: str, data: dict):
    """
    Saves a user's assistant info to S3 as JSON and updates the reverse lookup table.
    The reverse lookup maps assistant_id -> { 'username', 'course_title' }.
    """
    try:
        # 1) Save this user's assistant info in their user folder
        user_s3_key = get_assistant_s3_path(username)
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=user_s3_key,
            Body=json.dumps(data, indent=4).encode("utf-8"),
            ContentType="application/json",
        )

        # 2) Load the reverse lookup table
        reverse_s3_key = get_reverse_mapping_s3_path()
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=reverse_s3_key)
            reverse_mapping = json.loads(response["Body"].read().decode("utf-8"))
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                reverse_mapping = {}
            else:
                raise e

        # 3) Remove any old assistant_id that belongs to this user
        old_id_to_remove = None
        for existing_id, info in reverse_mapping.items():
            if info.get("username") == username:
                old_id_to_remove = existing_id
                break

        if old_id_to_remove:
            reverse_mapping.pop(old_id_to_remove, None)

        # 4) If there's a new assistant_id, store it
        if "assistant_id" in data:
            reverse_mapping[data["assistant_id"]] = {
                "username": username,
                "course_id": course_id
            }

        # 5) Save the updated reverse lookup table to S3
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=reverse_s3_key,
            Body=json.dumps(reverse_mapping, indent=4).encode("utf-8"),
            ContentType="application/json",
        )

    except ClientError as e:
        print(f"Error saving assistant to S3: {e}")



def load_assistant_user_from_s3(assistant_id: str) -> dict:
    """
    Given an assistant ID, find the associated username and course title.
    Returns {"username": <username>, "course_title": <course_title>} if found.
    Returns None if not found.
    """
    try:
        # Load reverse lookup table
        reverse_s3_key = get_reverse_mapping_s3_path()
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=reverse_s3_key)
        reverse_mapping = json.loads(response["Body"].read().decode("utf-8"))

        return reverse_mapping.get(assistant_id, None)  # Returns dict or None
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return None
        print(f"Error retrieving user and course from assistant ID: {e}")
        return None


def check_and_create_user_folder(user_email):
    """Check if user folder exists in S3, create it, and ensure a basic user_info.json exists."""
    try:
        bucket_name = S3_BUCKET_NAME
        user_folder_key = f"user_data/{user_email}/"
        user_info_key = f"{user_folder_key}user_info.json"

        # Create the empty "folder" object (S3 doesn't have real folders)
        try:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=user_folder_key,
                Body=''
            )
            print(f"Created user folder: {user_folder_key}")
        except Exception as folder_error:
            print(f"Error creating folder {user_folder_key}: {folder_error}")
            # Continue anyway, as we're mainly concerned with the user_info.json file

        # Check if user_info.json already exists
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=user_info_key)
            user_info = json.loads(response['Body'].read().decode('utf-8'))

            # Remove obsolete 'courses' field if it exists
            if 'courses' in user_info:
                del user_info['courses']
                user_info['email'] = user_email
                user_info['updated_at'] = datetime.now().isoformat()
                # Re-upload the cleaned user_info
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=user_info_key,
                    Body=json.dumps(user_info).encode('utf-8'),
                    ContentType='application/json'
                )
                print(f"Updated existing user_info.json for {user_email}")
            return True

        except ClientError as e:
            # If the file doesn't exist, we'll create it
            if e.response['Error']['Code'] in ['NoSuchKey', '404']:
                # Create new user_info.json file
                user_info_content = {
                    "email": user_email,
                    "created_at": datetime.now().isoformat()
                }
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=user_info_key,
                    Body=json.dumps(user_info_content).encode('utf-8'),
                    ContentType='application/json'
                )
                print(f"Created new user_info.json for {user_email}")
                return True
            else:
                print(f"AWS Error checking user_info.json: {str(e)}")
                return False

    except Exception as e:
        print(f"Failed checking/creating user folder/info for {user_email}: {str(e)}")
        return False


def list_user_course_ids(user_email: str) -> list:
    """List course ID subdirectories within a user's S3 folder."""
    user_folder = get_user_s3_folder(user_email)
    course_ids = []

    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=S3_BUCKET_NAME, Prefix=user_folder, Delimiter='/')

        for page in page_iterator:
            if 'CommonPrefixes' in page:
                for prefix in page['CommonPrefixes']:
                    full_prefix = prefix.get('Prefix')
                    if full_prefix:
                        course_id = full_prefix.rstrip('/').split('/')[-1]
                        if course_id and course_id != user_email: # Ensure it's not the user folder itself
                            course_ids.append(course_id)

    except ClientError as e:
        print(f"Could not list course IDs for {user_email}: {e}")
        return [] # Return empty list on error
    except Exception as e:
        print(f"Unexpected error listing course IDs for {user_email}: {e}")
        return []

    print(f"Found course IDs for {user_email}: {course_ids}")
    return course_ids


def list_files_in_prefix(bucket: str, prefix: str, file_extension: str = None) -> list:
    """List files in S3 prefix with optional extension filter"""
    try:
        objects = []
        paginator = s3_client.get_paginator('list_objects_v2')

        # Remove trailing slash if present
        prefix = prefix.rstrip('/') + '/'

        # Paginate through all objects in the prefix
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            if 'Contents' in page:
                objects.extend([item['Key'] for item in page['Contents']])

        # Filter by file extension if specified
        if file_extension:
            file_extension = file_extension.lower().lstrip('.')
            objects = [obj for obj in objects if obj.lower().endswith(f'.{file_extension}')]

        return objects

    except ClientError as e:
        print(f"Error listing objects in {bucket}/{prefix}: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error listing files: {e}")
        return []


def download_file_from_s3(bucket: str, s3_key: str, local_path: str) -> bool:
    """Download a file from S3 to local path"""
    try:
        # Create directory structure if needed
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        s3_client.download_file(bucket, s3_key, local_path)
        print(f"Successfully downloaded {s3_key} to {local_path}")
        return True

    except ClientError as e:
        if e.response['Error']['Code'] == "404":
            print(f"File not found: {s3_key}")
        else:
            print(f"Error downloading {s3_key}: {str(e)}")
        return False
    except Exception as e:
        print(f"General error downloading {s3_key}: {str(e)}")
        return False


def get_assistant_last_position(username, course_id):
    """
    Get the last position where an assistant was explaining for a specific course.
    Returns the position number if found, or 0 if not found.
    """
    try:
        s3_path = get_s3_file_path(username, course_id, "assistant_position.json")

        try:
            response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=s3_path)
            position_data = json.load(response['Body'])
            return position_data.get('last_position', 0)
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                return 0
            raise e
    except Exception as e:
        print(f"Error getting assistant last position: {e}")
        return 0


def upload_directory_to_s3(local_path, bucket, s3_prefix):
    """
    Upload an entire directory to S3
    
    Args:
        local_path (str): Path to the local directory
        bucket (str): S3 bucket name
        s3_prefix (str): Prefix to use for S3 keys (folder path in S3)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Make sure the prefix ends with a slash
        if not s3_prefix.endswith('/'):
            s3_prefix += '/'
            
        # Walk through the directory
        for root, dirs, files in os.walk(local_path):
            for file in files:
                local_file_path = os.path.join(root, file)
                
                # Calculate relative path from the base directory
                rel_path = os.path.relpath(local_file_path, local_path)
                
                # Create S3 key by joining prefix with relative path
                s3_key = f"{s3_prefix}{rel_path.replace(os.sep, '/')}"
                
                # Open file in binary mode
                with open(local_file_path, 'rb') as file_obj:
                    # Determine content type
                    content_type = 'application/json' if local_file_path.endswith('.json') else 'image/png' if local_file_path.endswith('.png') else 'application/octet-stream'
                    
                    # Upload the file directly with put_object
                    s3_client.put_object(
                        Bucket=bucket,
                        Key=s3_key,
                        Body=file_obj.read(),
                        ContentType=content_type
                    )
                    print(f"Uploaded {local_file_path} to {bucket}/{s3_key}")
                
        return True
    except Exception as e:
        print(f"Error uploading directory to S3: {str(e)}")
        return False 