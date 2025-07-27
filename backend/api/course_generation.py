from flask import Blueprint, request, jsonify, Response
import os
import tempfile
import json
import sys
from utils import user_utils, s3_utils
from course_content_generation.gemini_course_outline_generator import CourseOutlineGenerator
from course_content_generation.gemini_slide_speech_generator import process_course_outline
from flask_cors import cross_origin

course_generation = Blueprint('course_generation', __name__)

@course_generation.route('/generate-outline', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def generate_course_outline():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight handling for generate-outline'}), 200
    
    # Set up SSE response
    def generate():
        try:
            # Authentication
            username = user_utils.get_current_user(request)
            if not username:
                yield f"data: {json.dumps({'status': 'error', 'message': 'Unauthorized'})}\n\n"
                return

            # Get course ID from request
            data = request.get_json()
            course_id = data.get('course_id')
            if not course_id:
                yield f"data: {json.dumps({'status': 'error', 'message': 'Missing course ID'})}\n\n"
                return

            # S3 paths configuration
            base_s3_path = f"user_data/{username}/{course_id}/course_materials"
            s3_pdf_prefix = f"{base_s3_path}/"
            s3_outline_path = f"user_data/{username}/{course_id}/course_outline.json"

            # Send an initial event indicating PDF processing has started
            yield f"data: {json.dumps({'status': 'processing_pdf', 'message': 'Reading and processing PDF files...'})}\n\n"
            
            # Flush to ensure this message is sent immediately
            sys.stdout.flush()
            
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
                    yield f"data: {json.dumps({'status': 'error', 'message': 'No PDF files found in course materials', 'debug_info': {'s3_path': f"s3://jasmintechs-tutorion/{s3_pdf_prefix}", 'expected_location': f"user_data/{username}/{course_id}/course_materials/your-file.pdf"}})}\n\n"
                    return

                # Process first PDF
                first_pdf_key = pdf_files[0]
                local_pdf_path = os.path.join(temp_dir, 'source.pdf')
                
                # Download PDF from S3
                if not s3_utils.download_file_from_s3(
                    bucket='jasmintechs-tutorion',
                    s3_key=first_pdf_key,
                    local_path=local_pdf_path
                ):
                    yield f"data: {json.dumps({'status': 'error', 'message': 'Failed to download PDF from storage'})}\n\n"
                    return

                # Generate outline
                generator = CourseOutlineGenerator()
                result = generator.generate_from_pdf(local_pdf_path, stream=True)
                
                if 'error' in result:
                    yield f"data: {json.dumps({'status': 'error', 'message': result['error']})}\n\n"
                    return

                # Save outline to S3
                s3_utils.upload_json_to_s3(
                    json_data=result,
                    bucket_name ='jasmintechs-tutorion',
                    s3_key=s3_outline_path
                )

                # Then start the actual generation
                yield f"data: {json.dumps({'status': 'stream_starting', 'message': 'STREAM OUTPUT BEGINS'})}\n\n"
                sys.stdout.flush()
                
                # When generating each chunk, include a status
                for chunk in generator.stream_response:
                    yield f"data: {json.dumps({'status': 'generating', 'chunk': chunk})}\n\n"
                    sys.stdout.flush()
                
                # Final completion message
                yield f"data: {json.dumps({'status': 'completed', 'message': 'Generation complete'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@course_generation.route('/generate-slides', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def generate_slides():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight handling for generate-slides'}), 200
    """Endpoint to generate slides from existing outline"""
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

            # Upload all slides directory at once using the new utility function
            slides_s3_prefix = f"user_data/{username}/{course_id}/slides/"
            s3_utils.upload_directory_to_s3(
                local_path=output_dir,
                bucket='jasmintechs-tutorion',
                s3_prefix=slides_s3_prefix
            )
            
            # Upload all_slides.json file to the course level for easy access by frontend
            all_slides_path = os.path.join(output_dir, "all_slides.json")
            if os.path.exists(all_slides_path):
                with open(all_slides_path, 'rb') as f:
                    s3_utils.upload_file_to_s3(
                        file=f,
                        bucket_name='jasmintechs-tutorion',
                        s3_key=f"user_data/{username}/{course_id}/slides.json"
                    )

        return jsonify({
            'message': 'Slides generated successfully',
            's3_path': slides_s3_prefix
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@course_generation.route('/get-course-outline', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def get_course_outline():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight handling for get-course-outline'}), 200
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
