from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import utils.user_utils as user_utils
import utils.s3_utils as s3_utils

upload_bp = Blueprint('upload', __name__)
UPLOAD_FOLDER = "../uploads"

@upload_bp.route('/upload-files', methods=['POST'])
def upload_files():
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    if 'files' not in request.files:
        return jsonify({'error': 'No files part'}), 400

    if 'coursename' not in request.form:
        return jsonify({'error': 'No course name'}), 400
    
    coursename = request.form['coursename']
    files = request.files.getlist('files')
    uploaded_files = []

    for file in files:
        if file.filename:
            filename = secure_filename(file.filename)
            file.seek(0)
            s3_utils.upload_file_to_s3(file, "jasmintechs-tutorion",
                                       s3_utils.get_s3_file_path(username, coursename, filename))
            uploaded_files.append(filename)

    return jsonify({'message': 'Files uploaded successfully', 'files': uploaded_files})
