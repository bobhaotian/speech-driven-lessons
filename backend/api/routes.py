from .webhook import webhook
from .assistant import assistant
from .in_class import in_class
from .course import course
from .course_generation import course_generation
from .user import user
from flask import request, jsonify
from . import api

# Register blueprints
api.register_blueprint(webhook, url_prefix='/webhook')
api.register_blueprint(assistant, url_prefix='/assistant')
api.register_blueprint(in_class, url_prefix='/in-class')

api.register_blueprint(course, url_prefix='/course')
api.register_blueprint(user, url_prefix='/user')
api.register_blueprint(course_generation, url_prefix='/course_generation')