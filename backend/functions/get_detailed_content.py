from s3_context_manager import ContextManager as S3ContextManager
import utils.s3_utils as s3_utils
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")

s3_bucket = "jasmintechs-tutorion"

def get_detailed_content(course_title, user, user_query):
    s3_context_manager = S3ContextManager(user, course_title, api_key=API_KEY)
    s3_context_manager.load_saved_indices()
    return s3_context_manager.get_relevant_chunks(user_query)
