import os
import logging
import firebase_admin
from firebase_admin import credentials, auth
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def initialize_firebase_admin():
    """Initialize Firebase Admin SDK with credentials from environment variables"""
    try:
        # Get the private key and ensure it's properly formatted
        private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
        if not private_key:
            raise ValueError("FIREBASE_PRIVATE_KEY environment variable is not set")

        # Create the service account info dictionary
        service_account_info = {
            "type": "service_account",
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": private_key,
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
        }

        # Verify all required fields are present
        required_fields = ["project_id", "private_key_id", "private_key", "client_email", "client_id", "client_x509_cert_url"]
        missing_fields = [field for field in required_fields if not service_account_info.get(field)]
        if missing_fields:
            raise ValueError(f"Missing required Firebase configuration fields: {', '.join(missing_fields)}")

        # Initialize Firebase Admin if not already initialized
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
        else:
            logger.info("Firebase Admin SDK already initialized")
            
        return True
    except Exception as e:
        logger.error(f"Error initializing Firebase Admin SDK: {e}")
        return False

def verify_firebase_token(token):
    """Verify Firebase ID token and return decoded token or None if invalid"""
    try:
        if not token:
            logger.warning("No token provided")
            return None
            
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        try:
            # Verify the token
            decoded_token = auth.verify_id_token(token)
            logger.info(f"Token verified successfully for user: {decoded_token.get('email')}")
            return decoded_token
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            return None
    except Exception as e:
        logger.error(f"Error in verify_firebase_token: {str(e)}")
        return None

# Initialize Firebase Admin when the module is imported
initialize_firebase_admin()
