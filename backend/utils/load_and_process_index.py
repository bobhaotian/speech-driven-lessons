import tiktoken
import openai
# import faiss  # Comment out the direct import
import numpy as np
from difflib import SequenceMatcher
import time
import io
import json
import boto3
from utils.s3_utils import (
    get_course_s3_folder,
    upload_json_to_s3,
    upload_faiss_index_to_s3,
    ACCESS_KEY,
    SECRET_KEY,
    REGION_NAME
)

# Try to import faiss, make it optional
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    print("Warning: FAISS not available in load_and_process_index. Vector index functionality will be disabled.")
    FAISS_AVAILABLE = False
    faiss = None


def process_course_context_s3(bucket_name, username, coursename, api_key, max_tokens=2000):
    """Standalone function to process course files from S3 and upload indices back to S3"""
    start_time = time.time()

    # Initialize S3 client
    s3 = boto3.client('s3',
                      aws_access_key_id=ACCESS_KEY,
                      aws_secret_access_key=SECRET_KEY,
                      region_name=REGION_NAME)

    # 1. Load and combine text files from S3
    course_prefix = get_course_s3_folder(username, coursename)
    all_text = []

    try:
        # List and read text files
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix=course_prefix)
        for obj in response.get('Contents', []):
            if obj['Key'].endswith('.txt'):
                file_obj = s3.get_object(Bucket=bucket_name, Key=obj['Key'])
                all_text.append(file_obj['Body'].read().decode('utf-8'))

        if not all_text:
            raise ValueError("No text files found in course directory")

        combined_text = '\n'.join(all_text)
        del all_text  # Free memory early

    except Exception as e:
        print(f"Error loading files from S3: {str(e)}")
        return False

    # 2. Split into chunks with memory efficiency
    encoder = tiktoken.encoding_for_model("gpt-4")
    chunks = []
    current_chunk = []
    current_token_count = 0

    for line in combined_text.split('\n'):
        line_tokens = len(encoder.encode(line + '\n'))
        if current_token_count + line_tokens > max_tokens:
            if current_chunk:
                chunks.append('\n'.join(current_chunk))
                current_chunk = []
                current_token_count = 0
            # Handle long lines that exceed max_tokens
            while line_tokens > max_tokens:
                chunks.append(line[:len(line) // 2])
                line = line[len(line) // 2:]
                line_tokens = len(encoder.encode(line + '\n'))
            current_chunk.append(line)
            current_token_count = line_tokens
        else:
            current_chunk.append(line)
            current_token_count += line_tokens

    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    del combined_text  # Free memory

    # 3. Generate embeddings and build FAISS index (only if FAISS is available)
    faiss_index = None
    if FAISS_AVAILABLE:
        dimension = 3072  # text-embedding-3-large dimension
        faiss_index = faiss.IndexFlatL2(dimension)
        embeddings = []

        openai_client = openai.OpenAI(api_key=api_key)

        # Process chunks in batches to control memory usage
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            try:
                response = openai_client.embeddings.create(
                    model="text-embedding-3-large",
                    input=batch
                )
                batch_embeddings = [e.embedding for e in response.data]
                embeddings.extend(batch_embeddings)
            except Exception as e:
                print(f"Error generating embeddings: {str(e)}")
                embeddings.extend([np.zeros(dimension).tolist()] * len(batch))

            # Clear memory between batches
            del batch
            del response

        # Convert to numpy array and add to FAISS
        embeddings_np = np.array(embeddings).astype('float32')
        faiss_index.add(embeddings_np)
        del embeddings
        del embeddings_np
    else:
        print("Warning: FAISS not available. Skipping vector index creation.")

    # 4. Build inverted index
    inverted_index = {}
    for i, chunk in enumerate(chunks):
        quotes = [line for line in chunk.split('\n') if line.startswith('"')]
        for quote in quotes:
            inverted_index[quote.lower()] = i

    # 5. Upload all artifacts to S3
    base_key = get_course_s3_folder(username, coursename)

    # Upload chunks
    upload_json_to_s3(chunks, bucket_name, f"{base_key}chunks.json")
    del chunks

    # Upload FAISS index (only if available)
    if FAISS_AVAILABLE and faiss_index is not None:
        upload_faiss_index_to_s3(faiss_index, bucket_name, f"{base_key}faiss.index")
        del faiss_index
    else:
        print("Warning: FAISS index not created or FAISS not available. Skipping FAISS index upload.")

    # Upload inverted index
    upload_json_to_s3(inverted_index, bucket_name, f"{base_key}inverted_index.json")
    del inverted_index

    print(f"Total processing time: {time.time() - start_time:.2f} seconds")
    return True
