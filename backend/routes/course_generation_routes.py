from flask import Blueprint, request, jsonify
import os
import tempfile
import json
from utils import user_utils, s3_utils
from course_content_generation.gemini_course_outline_generator import CourseOutlineGenerator
from course_content_generation.gemini_slide_speech_generator import process_course_outline

course_generation = Blueprint('course_generation', __name__)

@course_generation.route('/generate-outline', methods=['POST'])
def generate_course_outline():
    """Endpoint to generate course outline from PDF stored in S3"""
    try:
        # Authentication
        username = user_utils.get_current_user(request)
        if not username:
            return jsonify({'error': 'Unauthorized'}), 401

        # Get course ID from request
        data = request.get_json()
        course_id = data.get('course_id')
        if not course_id:
            return jsonify({'error': 'Missing course ID'}), 400

        # S3 paths configuration
        base_s3_path = f"user_data/{username}/{course_id}/course_materials"
        s3_pdf_prefix = f"{base_s3_path}/"
        s3_outline_path = f"user_data/{username}/{course_id}/course_outline.json"

        with tempfile.TemporaryDirectory() as temp_dir:
            # Get all PDFs from course materials folder
            pdf_files = s3_utils.list_files_in_prefix(
                bucket='jasmintechs-tutorion',
                prefix=s3_pdf_prefix,
                file_extension='.pdf'
            )

            # Add debug logging
            print(f"Looking for PDFs in: s3://jasmintechs-tutorion/{s3_pdf_prefix}")
            print(f"Found {len(pdf_files)} PDF files: {pdf_files}")

            if not pdf_files:
                return jsonify({
                    'error': 'No PDF files found in course materials',
                    'debug_info': {
                        's3_path': f"s3://jasmintechs-tutorion/{s3_pdf_prefix}",
                        'expected_location': f"user_data/{username}/{course_id}/course_materials/your-file.pdf"
                    }
                }), 404

            # Process first PDF
            first_pdf_key = pdf_files[0]
            local_pdf_path = os.path.join(temp_dir, 'source.pdf')
            
            # Download PDF from S3
            if not s3_utils.download_file_from_s3(
                bucket='jasmintechs-tutorion',
                s3_key=first_pdf_key,
                local_path=local_pdf_path
            ):
                return jsonify({'error': 'Failed to download PDF from storage'}), 500

            # Generate outline
            generator = CourseOutlineGenerator()
            result = generator.generate_from_pdf(local_pdf_path, stream=True)
            
            if 'error' in result:
                return jsonify({'error': result['error']}), 500

            # Save outline to S3
            s3_utils.upload_json_to_s3(
                json_data=result,
                bucket_name ='jasmintechs-tutorion',
                s3_key=s3_outline_path
            )

        return jsonify({
            'message': 'Outline generated successfully',
            'course_id': course_id,
            's3_paths': {
                'pdf_source': first_pdf_key,
                'outline': s3_outline_path
            },
            'course_outline': result['course_outline']
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@course_generation.route('/generate-slides', methods=['POST'])
def generate_slides():
    """Endpoint to generate slides from existing outline and PDF"""
    try:
        # Authentication
        username = user_utils.get_current_user(request)
        if not username:
            return jsonify({'error': 'Unauthorized'}), 401

        # Get course ID from request
        data = request.get_json()
        course_id = data.get('course_id')
        detail_level = data.get('detail_level', 'normal')
        if not course_id:
            return jsonify({'error': 'Missing course ID'}), 400

        # S3 paths configuration (match generate_course_outline)
        base_s3_path = f"user_data/{username}/{course_id}/course_materials"
        s3_pdf_prefix = f"{base_s3_path}/"
        s3_outline_path = f"user_data/{username}/{course_id}/course_outline.json"

        # Find the PDF file in course_materials
        pdf_files = s3_utils.list_files_in_prefix(
            bucket='jasmintechs-tutorion',
            prefix=s3_pdf_prefix,
            file_extension='.pdf'
        )
        if not pdf_files:
            return jsonify({'error': 'No PDF files found in course materials'}), 404
        first_pdf_key = pdf_files[0]

        with tempfile.TemporaryDirectory() as temp_dir:
            local_pdf_path = os.path.join(temp_dir, 'source.pdf')
            local_outline_path = os.path.join(temp_dir, 'course_outline.json')
            output_dir = os.path.join(temp_dir, 'slides_output')

            # Download PDF
            if not s3_utils.download_file_from_s3(
                bucket='jasmintechs-tutorion',
                s3_key=first_pdf_key,
                local_path=local_pdf_path
            ):
                return jsonify({'error': 'Failed to download PDF from storage'}), 500

            # Download outline
            if not s3_utils.download_file_from_s3(
                bucket='jasmintechs-tutorion',
                s3_key=s3_outline_path,
                local_path=local_outline_path
            ):
                return jsonify({'error': 'Failed to download course outline from storage'}), 500

            # Generate slides
            process_course_outline(
                pdf_path=local_pdf_path,
                outline_path=local_outline_path,
                output_dir=output_dir,
                detail_level=detail_level,
                stream=True,
                max_workers=3
            )

            # Upload results to S3
            slides_s3_prefix = f"user_data/{username}/{course_id}/slides/"
            
            # Upload course_content.json to S3
            content_json_path = os.path.join(output_dir, "course_content.json")
            if os.path.exists(content_json_path):
                s3_utils.upload_file_to_s3(
                    local_path=content_json_path,
                    bucket='jasmintechs-tutorion',
                    s3_key=f"{slides_s3_prefix}course_content.json"
                )
            
            # Upload all_slides.json to S3 (used by the frontend)
            all_slides_path = os.path.join(output_dir, "all_slides.json")
            if os.path.exists(all_slides_path):
                with open(all_slides_path, 'r') as f:
                    slides_data = json.load(f)
                # Store the all slides data at the course level for easy access
                s3_utils.upload_json_to_s3(
                    json_data=slides_data,
                    bucket_name='jasmintechs-tutorion',
                    s3_key=f"user_data/{username}/{course_id}/slides.json"
                )
            
            # Upload individual section files and images
            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    if file.endswith('.json') or file.endswith('.png'):
                        local_file_path = os.path.join(root, file)
                        # Calculate the relative path from the output_dir
                        rel_path = os.path.relpath(local_file_path, output_dir)
                        # Create the S3 key by joining the slides prefix with the relative path
                        s3_key = f"{slides_s3_prefix}{rel_path.replace(os.sep, '/')}"
                        
                        # Upload the file
                        s3_utils.upload_file_to_s3(
                            local_path=local_file_path,
                            bucket='jasmintechs-tutorion',
                            s3_key=s3_key
                        )

        return jsonify({
            'message': 'Slides generated successfully',
            's3_path': slides_s3_prefix
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@course_generation.route('/get-course-outline', methods=['POST'])
def get_course_outline():
    """Retrieve generated course outline from S3"""
    try:
        # Authentication
        username = user_utils.get_current_user(request)
        if not username:
            return jsonify({'error': 'Unauthorized'}), 401

        # Get course ID from request
        data = request.get_json()
        course_id = data.get('course_id')
        if not course_id:
            return jsonify({'error': 'Missing course ID'}), 400

        # Build S3 path
        s3_outline_path = f"user_data/{username}/{course_id}/course_outline.json"

        # Download outline from S3
        with tempfile.TemporaryDirectory() as temp_dir:
            local_path = os.path.join(temp_dir, 'outline.json')
            
            if not s3_utils.download_file_from_s3(
                bucket='jasmintechs-tutorion',
                s3_key=s3_outline_path,
                local_path=local_path
            ):
                return jsonify({'error': 'Course outline not found'}), 404

            # Load and return the outline
            with open(local_path, 'r') as f:
                outline_data = json.load(f)

        return jsonify({
            'message': 'Outline retrieved successfully',
            'course_outline': outline_data.get('course_outline', []),
            'metadata': {
                'generated_at': outline_data.get('generated_at'),
                'source_pdf': outline_data.get('source_pdf')
            }
        }), 200

    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid outline format in storage'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@course_generation.route('/get-course-slides', methods=['POST'])
def get_course_slides():
    """Retrieve generated course slides from S3"""
    try:
        # Authentication
        username = user_utils.get_current_user(request)
        if not username:
            return jsonify({'error': 'Unauthorized'}), 401

        # Get course ID from request
        data = request.get_json()
        course_id = data.get('course_id')
        if not course_id:
            return jsonify({'error': 'Missing course ID'}), 400

        # Build S3 path - slides are in the slides folder, in all_slides.json
        s3_slides_path = f"user_data/{username}/{course_id}/slides.json"

        # Download slides from S3
        with tempfile.TemporaryDirectory() as temp_dir:
            local_path = os.path.join(temp_dir, 'slides.json')
            
            if not s3_utils.download_file_from_s3(
                bucket='jasmintechs-tutorion',
                s3_key=s3_slides_path,
                local_path=local_path
            ):
                return jsonify({'error': 'Course slides not found'}), 404

            # Load and return the slides
            with open(local_path, 'r') as f:
                slides_data = json.load(f)

        return jsonify({
            'message': 'Slides retrieved successfully',
            'slides': slides_data,
            'metadata': {
                's3_path': s3_slides_path
            }
        }), 200

    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid slides format in storage'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500