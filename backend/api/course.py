from flask import Blueprint, request, jsonify
import utils.user_utils as user_utils
import utils.s3_utils as s3_utils
import utils.load_and_process_index as faiss_utils
import os
import json
import logging
from datetime import datetime
from flask_cors import cross_origin
from dotenv import load_dotenv

from utils.course_manager import CourseManager

load_dotenv()

course = Blueprint('course', __name__)
logger = logging.getLogger(__name__)

"""
Courses endpoints below
"""
@course.route('/create-course', methods=['POST'])
def create_course():
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return jsonify({'error': 'Server configuration error: Missing API key'}), 500

    try:
        # Get data from request - assuming JSON body now instead of form-data
        data = request.get_json()
        if not data:
             return jsonify({'error': 'Missing JSON request body'}), 400
             
        # Required fields
        course_title = data.get('course_title')
        if not course_title:
            return jsonify({'error': 'Course title is required'}), 400
            
        # Optional fields for creation/update
        course_id = data.get('course_id') # For updating existing course
        description = data.get('description') # Optional description
        ai_voice = data.get('ai_voice', 'jennifer') # Default voice
        
        # Extract step and completion status from nested object if present
        create_process_data = data.get('create_course_process', {}) # Get the nested dict or empty dict
        creation_step = create_process_data.get('current_step', 1) # Default step 1
        is_creation_complete = create_process_data.get('is_creation_complete', False) # Default not complete
        
        # Instantiate the manager
        manager = CourseManager(user_email=user_email, api_key=api_key)

        # Call the manager method
        result_info = manager.create_or_update_course(
            course_title=course_title,
            course_id=course_id, # Pass ID if updating
            description=description,
            ai_voice=ai_voice,
            # uploaded_files_metadata is NOT passed here - managed by add/remove methods
            creation_step=creation_step,
            is_creation_complete=is_creation_complete
        )

        # Determine message based on whether it was a create or update
        message_action = "updated" if course_id else "created"
        return jsonify({ 
            'message': f'Course {message_action} successfully', 
            'course': result_info # Return the full course info object
        }), 200

    except ValueError as ve:
        # Handle potential errors from CourseManager (e.g., failed fetch for update)
        logger.warning(f"Value error during course creation/update for {user_email}: {str(ve)}")
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        logger.error(f"Error creating/updating course for {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred during course creation/update.'}), 500

@course.route('/customize', methods=['POST'])
def customize_course():
    # TODO: will doing in customize_course be needed
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401
        
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return jsonify({'error': 'Server configuration error: Missing API key'}), 500

    try:
        data = request.json
        course_id = data.get('id')
        if not course_id:
             return jsonify({'error': 'Course ID is required'}), 400
             
        # TODO: Extract other customization params from data
        title = data.get('title')
        progress = data.get('progress', 0)
        ai_tutor = data.get('aiTutor', {})
        uploaded_files = data.get('uploadedFiles', [])

        manager = CourseManager(user_email=user_email, api_key=api_key)
        success = manager.customize_course(
            course_id=course_id, 
            title=title, 
            progress=progress, 
            ai_tutor=ai_tutor, 
            uploaded_files=uploaded_files
        )

        if success:
            return jsonify({'message': 'Course customized successfully.'}), 200
        else:
            # CourseManager should log the specific error
            return jsonify({'error': 'Failed to customize course.'}), 500
    except Exception as e:
        logger.error(f"Error in /customize for user {user_email}, course {data.get('id')}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@course.route('/generate-course-syllabus', methods=['POST'])
@cross_origin(supports_credentials=True) 
def generate_course_syllabus():
    """Generate course syllabus based on uploaded content"""
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON request body'}), 400
        
    course_id = data.get('course_id')
    if not course_id:
        return jsonify({'error': 'Course ID is required'}), 400
            
    try:
        logger.info(f"Syllabus generation requested for course {course_id} by user {user_email}")
        manager = CourseManager(user_email=user_email)
        syllabus_data = manager.generate_syllabus(course_id)
        
        if syllabus_data:
            logger.info(f"Syllabus successfully generated for course {course_id}")
            return jsonify(syllabus_data), 200
        else:
            logger.error(f"Syllabus generation failed for course {course_id}")
            return jsonify({'error': 'Failed to generate syllabus'}), 500
            
    except Exception as e:
        logger.error(f"Error in /generate-course-syllabus for user {user_email}, course {course_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@course.route('/generate-course-slides', methods=['POST'])
@cross_origin(supports_credentials=True)
def generate_course_slides():
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    course_id = data.get('course_id')
    if not course_id:
        return jsonify({'error': 'Course ID is required'}), 400

    manager = CourseManager(user_email=user_email)
    success = manager.generate_slides(course_id)
    
    if success:
        return jsonify({'message': 'Slides generated successfully'}), 200
    else:
        return jsonify({'error': 'Failed to generate slides'}), 500
    

@course.route('/courses', methods=['GET'])
def get_courses():
    """Get all courses (complete and incomplete) for the authenticated user"""
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return jsonify({'error': 'Server configuration error: Missing API key'}), 500

    try:
        manager = CourseManager(user_email=user_email, api_key=api_key)

        result = manager.get_all_courses()
        
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting courses for {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred while fetching courses.'}), 500

@course.route('/fetch-course/<course_id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def fetch_course_info(course_id):
    """Fetch a single course info by ID"""
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        # Initialize CourseManager (without API key since not needed for this operation)
        manager = CourseManager(user_email=user_email)
        
        # Get course info
        course_info = manager.get_course_info(course_id)
        
        if not course_info:
            return jsonify({'error': 'Course not found or access denied'}), 404
            
        # Return the course info
        return jsonify({
            'message': 'Course info retrieved successfully',
            'course': course_info
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching course {course_id} for user {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred while fetching course info.'}), 500

# TODO: Add endpoints for delete_course if needed
@course.route('/delete/<course_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def delete_course_endpoint(course_id):
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        manager = CourseManager(user_email=user_email)
        success = manager.delete_course(course_id)
        if success:
            return jsonify({'message': 'Course deleted successfully'}), 200
        else:
            # CourseManager logs the specific error
            logger.error(f"CourseManager failed to delete course {course_id} for user {user_email}")
            return jsonify({'error': 'Failed to delete course'}), 500
    except Exception as e:
        logger.error(f"Exception deleting course {course_id} for user {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred during course deletion.'}), 500


"""
File managements endpoints directly with S3 below
"""

@course.route('/upload-file', methods=['POST'])
def upload_file():
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Check if the file is a PDF
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Only .pdf files are currently supported'}), 400

    course_id = request.form.get('course_id')
    if not course_id:
        return jsonify({'error': 'Missing course_id parameter'}), 400

    filename = file.filename 
    s3_key = s3_utils.get_s3_course_materials_path(user_email, course_id, filename)

    try:
        # Get file size before uploading (seek back to start after reading for size)
        file.seek(0, os.SEEK_END)
        filesize = file.tell()
        file.seek(0) # Reset file pointer to the beginning for upload
        
        # 1. Upload file to S3
        s3_upload_success = s3_utils.upload_file_to_s3(
            file, 
            s3_utils.S3_BUCKET_NAME, 
            s3_key
        )

        if not s3_upload_success:
            logger.error(f"S3 upload failed for {s3_key}, user {user_email}")
            return jsonify({'error': 'Failed to upload file to storage'}), 500
            
        # 2. Update course_info.json via CourseManager
        manager = CourseManager(user_email=user_email)
        metadata_update_success = manager.add_uploaded_file(course_id, filename, filesize)
        
        if not metadata_update_success:
            # S3 upload succeeded, but metadata update failed. This is an inconsistent state.
            logger.critical(f"CRITICAL: S3 upload succeeded for {s3_key} but failed to update course_info.json for course {course_id}")
            return jsonify({'error': 'File uploaded but failed to update course metadata. Please contact support.'}), 500
            
        # Both S3 upload and metadata update succeeded
        return jsonify({'message': 'File uploaded and metadata updated successfully', 'filename': filename}), 200
            
    except Exception as e:
        logger.error(f"Error during upload process for file {filename}, course {course_id}, user {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred during file upload.'}), 500

@course.route('/delete-file', methods=['DELETE'])
def delete_file():
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400
        
    course_id = data.get('course_id')
    filename = data.get('filename')

    if not course_id or not filename:
        return jsonify({'error': 'Missing course_id or filename parameter'}), 400

    s3_key = s3_utils.get_s3_course_materials_path(user_email, course_id, filename)

    try:
        # 1. Delete file from S3
        s3_delete_success = s3_utils.delete_file_from_s3(s3_utils.S3_BUCKET_NAME, s3_key)

        if not s3_delete_success:
            logger.warning(f"S3 delete command failed or file not found for {s3_key}, user {user_email}. Proceeding to metadata update.")

        # 2. Update course_info.json via CourseManager (attempt even if S3 delete failed/file not found)
             
        # Instantiate manager without api_key for this specific task
        manager = CourseManager(user_email=user_email)
        metadata_update_success = manager.remove_uploaded_file(course_id, filename)
        
        if not metadata_update_success:
            # Metadata update failed. S3 state might be inconsistent if delete succeeded.
            logger.error(f"Failed to update course_info.json after attempting to delete file {filename} for course {course_id}")
            return jsonify({'error': 'Failed to update course metadata during file deletion.'}), 500

        # If S3 delete failed but metadata update succeeded, the file might still be in S3 but not listed.
        # If S3 delete succeeded and metadata update succeeded, all good.
        # If file wasn't in S3 and metadata update reflected that, all good.
        return jsonify({'message': 'File deletion processed successfully'}), 200
            
    except Exception as e:
        logger.error(f"Error during delete process for file {filename}, course {course_id}, user {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred during file deletion.'}), 500



@course.route('/get-file', methods=['GET'])
def get_file():
    # Placeholder - implement if needed
    return jsonify({'message': 'Get file endpoint not implemented'}), 501

@course.route('/process-content/<course_id>', methods=['POST'])
@cross_origin(supports_credentials=True)
def process_course_content_endpoint(course_id):
    """Processes course content by chunking files and creating FAISS embeddings"""
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return jsonify({'error': 'Server configuration error: Missing API key'}), 500

    try:
        logger.info(f"Starting content processing for course {course_id}, user {user_email}")
        manager = CourseManager(user_email=user_email, api_key=api_key)
        # success_for_building_faiss = manager.process_course_content(course_id) we dont need to build faiss anymore
        success_for_building_slides = manager.generate_slides(course_id)
        if success_for_building_slides:
            return jsonify({'message': 'Course content processed successfully'}), 200
        else:
            logger.error(f"Content processing failed for course {course_id}")
            return jsonify({'error': 'Failed to process course content'}), 500
    except ValueError as ve:
        # Likely API key related error
        logger.error(f"Value error during content processing for course {course_id}: {str(ve)}")
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        logger.error(f"Exception processing content for course {course_id}, user {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred during content processing'}), 500

@course.route('/auto-save-content', methods=['POST'])
def auto_save_content():
    """Auto-saves course content without changing the step"""
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        # Get data from request
        data = request.get_json()
        if not data:
             return jsonify({'error': 'Missing JSON request body'}), 400
             
        # Required fields
        course_title = data.get('course_title')
        if not course_title:
            return jsonify({'error': 'Course title is required'}), 400
            
        # Optional fields
        course_id = data.get('course_id')
        description = data.get('description')
        
        # Initialize CourseManager
        manager = CourseManager(user_email=user_email)
        
        # First-time save (create new course)
        if not course_id:
            logger.info(f"Creating new course via auto-save for {user_email}")
            # For first save, set step to 1 (title step)
            result_info = manager.create_or_update_course(
                course_title=course_title,
                description=description,
                creation_step=1,
                is_creation_complete=False
            )
            return jsonify({ 
                'message': 'New course created successfully', 
                'course': result_info
            }), 200
        
        # Existing course update - get current info to preserve step
        current_course = manager.get_course_info(course_id)
        
        if not current_course:
            logger.warning(f"Course {course_id} not found for user {user_email} during auto-save")
            return jsonify({'error': f'Course {course_id} not found or does not exist'}), 404
        
        # Get current step info
        current_step = current_course.get('create_course_process', {}).get('current_step', 1)
        is_creation_complete = current_course.get('create_course_process', {}).get('is_creation_complete', False)
        
        # Create payload that preserves step info but updates content
        result_info = manager.create_or_update_course(
            course_title=course_title,
            course_id=course_id,
            description=description,
            creation_step=current_step,
            is_creation_complete=is_creation_complete
        )

        return jsonify({ 
            'message': 'Course content auto-saved successfully', 
            'course': result_info
        }), 200
    except ValueError as ve:
        logger.warning(f"Value error during auto-save for {user_email}: {str(ve)}")
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        logger.error(f"Error auto-saving content for {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred during auto-save.'}), 500


@course.route('/update-step', methods=['POST'])
def update_course_step():
    """Updates only the course step during navigation"""
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        # Get data from request
        data = request.get_json()
        if not data:
             return jsonify({'error': 'Missing JSON request body'}), 400
             
        # Required fields
        course_id = data.get('course_id')
        if not course_id:
            return jsonify({'error': 'Course ID is required'}), 400
        
        # Get step information
        create_process_data = data.get('create_course_process', {})
        creation_step = create_process_data.get('current_step')
        is_creation_complete = create_process_data.get('is_creation_complete', False)
        
        if not isinstance(creation_step, int) or creation_step < 1 or creation_step > 6:
            return jsonify({'error': 'Valid step number (1-6) is required'}), 400
        
        # Get current course info to preserve all other metadata
        manager = CourseManager(user_email=user_email)
        current_course = manager.get_course_info(course_id)
        
        if not current_course:
            logger.warning(f"Course {course_id} not found for user {user_email} during step update")
            return jsonify({'error': f'Course {course_id} not found or does not exist'}), 404
        
        # Keep existing content but update the step
        result_info = manager.create_or_update_course(
            course_title=current_course.get('title'),
            course_id=course_id,
            description=current_course.get('description'),
            creation_step=creation_step,
            is_creation_complete=is_creation_complete
        )

        return jsonify({ 
            'message': 'Course step updated successfully', 
            'course': result_info
        }), 200
    except ValueError as ve:
        logger.warning(f"Value error during step update for {user_email}: {str(ve)}")
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        logger.error(f"Error updating course step for {user_email}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred during step update.'}), 500

