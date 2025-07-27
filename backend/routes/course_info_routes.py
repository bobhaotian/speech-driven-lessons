from flask import Blueprint, request, jsonify
import os
import json
import utils.user_utils as user_utils  # Assuming this utility gets the current username
import utils.s3_utils as s3_utils  # Assuming this utility interacts with S3

course_info_bp = Blueprint('course_info', __name__)

@course_info_bp.route('/course_info', methods=['POST'])
def course_info():
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        # Get course info from S3
        s3_course_info = s3_utils.get_s3_user_courses_info(username)
        
        # Ensure we're returning a list of courses
        if not isinstance(s3_course_info, list):
            s3_course_info = []
            
        # Process each course to ensure required fields exist
        processed_courses = []
        for course in s3_course_info:
            processed_course = {
                'id': course.get('id'),
                'title': course.get('title', 'Untitled Course'),
                'progress': course.get('progress', 0),
                'hoursCompleted': course.get('hoursCompleted', 0),
                'author': course.get('author', 'Unknown Instructor')
            }
            processed_courses.append(processed_course)
            
        return jsonify({'courses': processed_courses})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
