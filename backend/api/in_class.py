import json
import os
from flask import Blueprint, request, jsonify
import utils.user_utils as user_utils
import utils.s3_utils as s3_utils
from dotenv import load_dotenv
from functions.slides_navigation import get_slides, get_current_slide, set_current_slide
from utils.socket_utils import emit_slide_change
import datetime

load_dotenv()

S3_BUCKET_NAME = "jasmintechs-tutorion"

in_class = Blueprint('in-class', __name__)

@in_class.route('/next-slide', methods=['POST'])
def next_slide():
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    request_data = request.get_json()
    assistant_id = request_data.get('assistant_id', '')

    user_course_data = s3_utils.load_assistant_user_from_s3(assistant_id)
    course_id = user_course_data['course_id']

    if not assistant_id:
        return jsonify({'error': 'Assistant ID is required'}), 400
    
    print(f"Going to next slide for {assistant_id}")
    slides = get_slides(course_id, username)
    if not slides:
        return "No slides found for this course."
    current_position = get_current_slide(assistant_id)

    new_position = current_position + 1
    if new_position < len(slides):
        set_current_slide(assistant_id, new_position)
        # Emit event to frontend via Socket.IO
        emit_slide_change(assistant_id, new_position)
        return "Here is the transcript you would like to read for the next slide: " + slides[new_position]['transcript']
    else:
        return "You're already at the last slide."
    
@in_class.route('/save-position', methods=['POST'])
def save_assistant_position():
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    request_data = request.get_json()
    assistant_id = request_data.get('assistant_id', '')
    course_id = request_data.get('course_id', '')
    position = request_data.get('position')

    if not assistant_id or position is None or not course_id:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    try:
        # First, get user data for this assistant
        user_data = s3_utils.load_assistant_user_from_s3(assistant_id)
        if not user_data:
            return jsonify({'error': 'Assistant not found'}), 404
            
        # Save the position to S3
        s3_path = s3_utils.get_s3_file_path(username, course_id, "assistant_position.json")
        position_data = {
            "assistant_id": assistant_id,
            "course_id": course_id,
            "last_position": position,
            "timestamp": str(datetime.datetime.now())
        }
        
        s3_utils.upload_json_to_s3(position_data, s3_utils.S3_BUCKET_NAME, s3_path)
        
        return jsonify({'success': True, 'message': 'Position saved successfully'}), 200
    except Exception as e:
        print(f"Error saving assistant position: {e}")
        return jsonify({'error': f'Failed to save position: {str(e)}'}), 500
    
    
