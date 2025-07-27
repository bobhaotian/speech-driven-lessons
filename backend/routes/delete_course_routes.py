from flask import Blueprint, request, jsonify
import utils.user_utils as user_utils  # Assuming this utility gets the current username
import utils.s3_utils as s3_utils  # Assuming this utility interacts with S3

delete_course_bp = Blueprint('delete_course', __name__)

@delete_course_bp.route('/delete-course', methods=['POST'])
def delete_course():
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    course_id = data.get('id')
    title = data.get('title')

    print("course_id: ", course_id)
    print("title: ", title)

    if not course_id or not title:
        return jsonify({'error': 'id and title are required'}), 400

    response = s3_utils.delete_folder_from_s3("jasmintechs-tutorion", s3_utils.get_course_s3_folder(username, title))

    if response:
        return jsonify({'message': 'Course deleted successfully'})
    else:
        return jsonify({'error': 'Course not found'}), 404
