from flask import Blueprint, request, jsonify
import utils.user_utils as user_utils
import utils.s3_utils as s3_utils
import os

delete_bp = Blueprint('delete', __name__)
UPLOAD_FOLDER = "../uploads"

@delete_bp.route('/delete-file', methods=['POST'])
def delete_file():
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    filename = data.get('filename').replace(" ", "_")
    coursename = data.get('coursename')

    if not filename or not coursename:
        return jsonify({'error': 'filename and coursename are required'}), 400

    file_path = s3_utils.get_s3_file_path(username, coursename, filename)
    response = s3_utils.delete_file_from_s3("jasmintechs-tutorion", file_path)

    if response:
        return jsonify({'message': 'File deleted successfully'})
    else:
        return jsonify({'error': 'File not found'}), 404
