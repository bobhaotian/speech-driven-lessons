from flask import Blueprint
import utils.user_utils as user_utils

user = Blueprint('user', __name__)

@user.route('/verify-user', methods=['POST', 'OPTIONS'])
def verify_user():
    """Route handler for verifying user token and initializing S3"""
    return user_utils.handle_verify_user()