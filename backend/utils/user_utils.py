from base64 import b64decode
import os
import firebase_admin
from firebase_admin import credentials, auth
import logging
from typing import Optional, Tuple, Dict, Any
from .firebase_admin import verify_firebase_token
from flask import request, jsonify, make_response
import utils.s3_utils as s3_utils

logger = logging.getLogger(__name__)

def get_current_user(request):
    """Get the current user's email from the request."""
    try:
        # For OPTIONS requests, return None to allow CORS preflight
        if request.method == 'OPTIONS':
            return None

        # Try to get email from cookies first
        user_email = request.cookies.get('user_email')
        if user_email:
            return user_email

        # If not in cookies, try to get from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.warning("No authorization header provided")
            return None

        # Remove 'Bearer ' prefix if present
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header

        # Verify the token and get the email
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            logger.warning("Invalid token provided")
            return None

        user_email = decoded_token.get('email')
        if not user_email:
            logger.warning("No email found in token")
            return None

        return user_email
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return None

def get_user_folder(upload_folder, username):
    return os.path.join(upload_folder, username)

def handle_verify_user():
    """
    Handle the verify-user route request
    
    Returns:
        Flask response object
    """
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:3000'))
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    try:
        # Get the token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.warning("No authorization header provided")
            return jsonify({'error': 'No authorization header provided'}), 401

        # Remove 'Bearer ' prefix if present
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header

        # Verify Firebase token
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            logger.warning("Invalid token provided")
            return jsonify({'error': 'Invalid token'}), 401

        user_email = decoded_token.get('email')
        if not user_email:
            logger.warning("No email found in token")
            return jsonify({'error': 'No email found in token'}), 401
        
        # Create user folder in S3 directly using s3_utils
        try:
            logger.info(f"Creating S3 folder for user {user_email}")
            success = s3_utils.check_and_create_user_folder(user_email)
            if not success:
                logger.error(f"Failed to create S3 folder for user {user_email}")
                return jsonify({'error': 'Failed to initialize user storage'}), 500
            logger.info(f"Successfully created S3 folder for user {user_email}")
        except Exception as e:
            logger.error(f"Error creating S3 folder for user {user_email}: {str(e)}")
            return jsonify({'error': f'Error creating user storage: {str(e)}'}), 500
        
        # Prepare the response data
        response_data = {
            'message': 'User verified successfully',
            'email': user_email,
            'courses': []  # Return empty list since we're not fetching courses
        }
        
        # Create response object
        response = make_response(jsonify(response_data))
        
        # Set CORS headers
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:3000'))
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        # Set the email cookie
        response.set_cookie(
            'user_email',
            user_email,
            httponly=True,
            samesite='Lax',
            path='/',
            max_age=86400  # 24 hours
        )
        
        logger.info(f"Returning response with cookie for {user_email}")
        return response

    except Exception as e:
        logger.error(f"Error in verify_user: {str(e)}")
        return jsonify({'error': str(e)}), 500



