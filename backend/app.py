from flask import Flask, request, jsonify, make_response
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from routes.upload_routes import upload_bp
from routes.delete_routes import delete_bp
from routes.customize_routes import customize_bp
from routes.voice_routes import voice_bp
from routes.aiTutor_routes import aitutor_bp
from routes.course_info_routes import course_info_bp
from routes.delete_course_routes import delete_course_bp
from api import api as api_blueprint
import utils.user_utils as user_utils
from utils.load_and_process_index import process_course_context_s3
from s3_context_manager import ContextManager as S3ContextManager
import utils.s3_utils as s3_utils
from chatbot import ChatBot
import os
from utils.socket_utils import init_socketio
from functions.slides_navigation import update_viewing_slide, go_to_starting_slide

app = Flask(__name__)
CORS(app,
     resources={r"/*": {
         "origins": ["http://localhost:3000"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "X-API-Key"],
         "supports_credentials": True,
         "expose_headers": ["Content-Type", "Authorization"]
     }},
     supports_credentials=True)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "supersecretkey")
socketio = SocketIO(app, cors_allowed_origins="*")
init_socketio(socketio)  # Pass socketio instance to the utility module

app.secret_key = os.getenv("FLASK_SECRET_KEY", "supersecretkey")  # Add for session management
s3_bucket = "jasmintechs-tutorion"
# Retrieve API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable must be set.")

# Register routes
app.register_blueprint(upload_bp)
app.register_blueprint(delete_bp)
app.register_blueprint(customize_bp)
app.register_blueprint(voice_bp)
app.register_blueprint(aitutor_bp)
app.register_blueprint(course_info_bp)
app.register_blueprint(delete_course_bp)
app.register_blueprint(api_blueprint, url_prefix='/api')

@app.route('/api/initialize-chatbot', methods=['POST'])
def initialize_chatbot():
    from flask import request, jsonify
    import json
    import os

    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        course_title = data.get('course_title', '')
        
        # Create a new context manager instance
        new_context_manager = S3ContextManager(api_key=API_KEY, user=username, course_title=course_title)
        
        # Try to load saved indices for the course
        if new_context_manager.load_saved_indices():
            print(f"Successfully loaded saved indices for course: {course_title}")
        else:
            print(f"No saved indices found for course: {course_title}")
            # Optionally process context if indices don't exist
            # new_context_manager.load_and_process_context_by_path(course_dir)
            process_course_context_s3(new_context_manager.s3_bucket, username, course_title, API_KEY)

        # Load the course configuration to get the system prompt
        # config_path = os.path.join(course_dir, "course_config.json")
        try:
            config_json = s3_utils.get_json_from_s3(new_context_manager.s3_bucket,
                                                    s3_utils.get_s3_file_path(username, course_title, "course_config.json"))
            system_prompt = config_json.get("system_prompt")
            if not system_prompt:
                raise ValueError("No system prompt found in course configuration")
            # with open(config_path, 'r', encoding='utf-8') as f:
            #     course_config = json.load(f)
            #     system_prompt = course_config.get("system_prompt")
            #     if not system_prompt:
            #         raise ValueError("No system prompt found in course configuration")
        except Exception as e:
            print(f"Error loading course configuration: {str(e)}")
            return jsonify({'error': 'Failed to load course configuration'}), 500

        # Create chatbot instance for this session
        chatbot = ChatBot(context_manager=new_context_manager, api_key=API_KEY)

        # Update the system prompt
        chatbot.update_system_prompt(system_prompt)

        return jsonify({
            'message': 'Chatbot initialized successfully',
            'course': course_title,
            'system_prompt': system_prompt
        })

    except Exception as e:
        print(f"Error initializing chatbot: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-ai-response', methods=['POST'])
def get_ai_response():
    from flask import request, jsonify
    from datetime import datetime
    import json
    import os
    import time

    start = time.time()

    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    user_input = data.get('input', '')
    
    # Client must send course_title in request
    course_title = data.get('course_title')  # Changed from global
    if not course_title:
        return jsonify({'error': 'course_title required in request'}), 400

    # Get chatbot from session (or recreate from course data)
    chatbot = ChatBot(context_manager=S3ContextManager(user=username, course_title=course_title, api_key=API_KEY))
    
    response = chatbot.process_message(user_input)

    print(f"AI response time: {time.time() - start:.2f}s")

    history_entry = {
        "timestamp": datetime.now().isoformat(),
        "user_input": user_input,
        "ai_response": response
    }

    start = time.time()

    try:
        # Get the course path from the course title in the same way as initialize_chatbot
        history_s3_key = s3_utils.get_s3_file_path(username, course_title, "course_history.json")

        # Load existing history or create new
        history = s3_utils.get_json_from_s3(s3_bucket, history_s3_key)
        if history is None:
            print("No existing conversation history found")
            history = {"conversations": []}

        # Append new conversation
        history["conversations"].append(history_entry)

        # Save updated history to S3
        s3_utils.upload_json_to_s3(history, s3_bucket, history_s3_key)
        print(f"Conversation history updated successfully at {history_s3_key}")

        print(f"History saving time: {time.time() - start:.2f}s")
        return jsonify(response)

    except Exception as e:
        print(f"Error saving conversation history: {str(e)}")
        # Still return the response even if saving history fails
        return jsonify(response)
    

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('join_course')
def handle_join(data):
    # User joins a specific course room
    assistant_id = data.get('assistant_id')
    if assistant_id:
        join_room(assistant_id)
        print(f"User joined course room: {assistant_id}")

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('update_viewing_slide')
def handle_viewing_slide_update(data):
    assistant_id = data.get('assistant_id')
    position = data.get('position')
    print(f"Received slide update for {assistant_id}: {position}")
    if assistant_id and position is not None:
        update_viewing_slide(assistant_id, position)

@socketio.on('welcome_block_start')
def handle_welcome_block_start(data):
    assistant_id = data.get('assistant_id')
    if assistant_id:
        print(f"Welcome block start requested for {assistant_id}")
        # Get the assistant and course info from the database/redis
        user_course_data = s3_utils.load_assistant_user_from_s3(assistant_id)
        if user_course_data:
            # Call the go_to_starting_slide function to initiate the course
            starting_slide_response = go_to_starting_slide(
                assistant_id,
                user_course_data['course_id'],
                user_course_data['username']
            )
            print(f"Starting slide response: {starting_slide_response}")

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
