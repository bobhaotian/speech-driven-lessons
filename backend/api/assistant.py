import json
import os
import time  # <-- we'll use time.time() to track concurrency
from flask import Blueprint, request, jsonify
import utils.user_utils as user_utils
import utils.s3_utils as s3_utils
from dotenv import load_dotenv
from vapi import Vapi

load_dotenv()

VAPI_KEY = os.getenv("VAPI_KEY")
S3_BUCKET_NAME = "jasmintechs-tutorion"

assistant = Blueprint('assistant', __name__)

@assistant.route('/create', methods=['POST'])
async def create_assistant():
    """
    Creates a new assistant for the user. If an existing assistant
    is found and is NOT from a newer request, delete it and replace it.
    Concurrency rule: last *started* request wins.
    """
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    request_data = request.get_json()

    course_id = request_data.get('course_id', '')

    course_config = s3_utils.get_json_from_s3(S3_BUCKET_NAME,
                                              s3_utils.get_s3_file_path(username, course_id, "course_config.json"))

    system_prompt = course_config.get("system_prompt").replace(" Be structured for your response: if the structure of your content is A:B:C, then type #A \n ##B \n ###C. Good luck! \n", "")

    # Mark this request's start time
    my_start_time = time.time()

    # Load user data from S3
    existing_data = s3_utils.load_user_assistant_from_s3(username)
    existing_start_time = existing_data.get("request_start_time", 0.0)

    # If there's a newer request in S3 (i.e. bigger start time), skip
    if existing_start_time > my_start_time:
        # This request is older than something else that started later,
        # so do NOT overwrite. Return a 409 or 200, up to you.
        return jsonify({
            "message": "A newer create request has already been made. Skipping this one."
        }), 409

    # Otherwise, proceed to delete any existing assistant
    existing_assistant_id = existing_data.get("assistant_id")
    client = Vapi(token=VAPI_KEY)

    if existing_assistant_id:
        try:
            client.assistants.delete(id=existing_assistant_id)
        except Exception as e:
            # Log the error but continue, we want to create a new assistant anyway
            print(f"Failed to delete existing assistant {existing_assistant_id}: {str(e)}")

    # Now create the new assistant
    assistant_name = f"Assistant for {username}"
    try:

        # Add the function call to the system prompt

        #  You can call getDetailedContent function to get more information about user's question on the course material. 
        function_call_prompt = '''
        You can call goToStartingSlide function to go to the starting slide of the course material and get the content of the starting slide when user asks to start the course.
        You can call goToNextSlide function to go to the next slide of the course material and get the content of the next slide.
        You can call goToPreviousSlide function to go to the previous slide of the course material and get the content of the previous slide.
        You can call goToSpecifiedSlide function to go to the specified slide of the course material as user requires by providing the specificslide number.
        You can call goToViewingSlide function to explain or go to the slide user is currently on when user asks to go to "this" slide or the slide that the user is currenly viewing.
        '''

        formating_prompt = '''
        Since you are a voice agent, do not format your response with markdown and only give response in pure text without formating like *text*.
        When student asks to explain the slide or ask a question, you should explain the slide or answer the question by your own knowledge and the course material you received prior to this request.
        '''

        print("starting assistant creation")

        created_assistant = client.assistants.create(
            name=assistant_name,
            transcriber={
                "provider": "talkscriber",
                "model": "whisper",
                "language": "en"
            },
            credentials=[{
                "provider": "openai",
                "api_key": os.getenv("OPENAI_API_KEY")
            }],
            model={
                "provider": "openai",
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt + function_call_prompt + formating_prompt
                    }
                ],
                "tools": [
                    # {
                    #     "name": "getDetailedContent",
                    #     "description": "Get detailed content for the user's question on the course material.",
                    #     "parameters": {
                    #         "type": "object",
                    #         "properties": {
                    #             "userQuery": {
                    #                 "type": "string",
                    #                 "description": "The user's question on the course material.",
                    #             },
                    #         },
                    #         "required": ["userQuery"],
                    #     },
                    # },
                    {   
                        "type": "function",
                        "async": False,
                        "function": {
                            "name": "goToStartingSlide",
                            "description": "Go to the starting slide of the course material.",
                            "parameters": {
                                "type": "object",
                                "properties": {},
                                "required": [],
                            }
                        }
                    },
                    {   
                        "type": "function",
                        "async": False,
                        "function": {
                            "name": "goToNextSlide",
                            "description": "Go to the next slide of the course material.",
                            "parameters": {
                                "type": "object",
                                "properties": {},
                                "required": [],
                            },
                        }
                    },
                    {
                        "type": "function",
                        "async": False,
                        "function": {
                            "name": "goToPreviousSlide",
                            "description": "Go to the previous slide of the course material.",
                            "parameters": {
                                "type": "object",
                                "properties": {},
                                "required": [],
                            }
                        }
                    },
                    {
                        "type": "function",
                        "async": False,
                        "function": {
                            "name": "goToSpecifiedSlide",
                        "description": "Go to the specified slide of the course material by providing the slide number.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "slideNumber": {
                                    "type": "integer",
                                    "description": "The slide number to go to.",
                                },
                            },
                                "required": ["slideNumber"],
                            },
                        }
                    },
                    {
                        "type": "function",
                        "async": False,
                        "function": {
                            "name": "goToViewingSlide",
                        "description": "Go to the slide that the user is currently on.",
                        "parameters": {
                                "type": "object",
                                "properties": {},
                                "required": [],
                            }
                        }
                    },
                ],
            },
            voice={
                "provider": "playht",
                "voiceId": "jennifer"
            },
            # first_message="Hello, how can I help you today?",
            silence_timeout_seconds=120
        )

        print("assistant created")
    except Exception as e:
        return jsonify({"error": f"Failed to create assistant: {str(e)}"}), 500

    # Just in case, recheck S3 to see if an even newer request started
    # while we were creating:
    latest_data = s3_utils.load_user_assistant_from_s3(username)
    latest_start_time = latest_data.get("request_start_time", 0.0)
    if latest_start_time > my_start_time:
        # Another request has superseded us
        # Delete the just-created assistant so we don't leak it
        try:
            client.assistants.delete(id=created_assistant.id)
        except Exception as e:
            print(f"Warning: Could not delete newly created assistant {created_assistant.id}: {str(e)}")
        return jsonify({
            "message": "A newer create request has been detected after creation. Discarding this assistant."
        }), 409

    # Otherwise, record the newly created assistant in S3
    new_data = {
        "assistant_id": created_assistant.id,
        "request_start_time": my_start_time
    }
    s3_utils.save_user_assistant_to_s3(username, course_id, new_data)

    return jsonify({"assistant_id": created_assistant.id}), 201



@assistant.route('/delete', methods=['POST'])
async def delete_assistant():
    """
    Deletes the user's assistant (if any) and updates the reverse mapping.
    """
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    current_data = s3_utils.load_user_assistant_from_s3(username)
    assistant_id = current_data.get("assistant_id")
    if not assistant_id:
        return jsonify({"error": "No assistant found for this user"}), 404

    user_course_data = s3_utils.load_assistant_user_from_s3(assistant_id)

    client = Vapi(token=VAPI_KEY)
    try:
        client.assistants.delete(id=assistant_id)
    except Exception as e:
        return jsonify({"error": f"Failed to delete assistant: {str(e)}"}), 500

    # Clear assistant data and reverse lookup table
    s3_utils.save_user_assistant_to_s3(username, user_course_data["course_id"], {})

    return jsonify({"message": "Assistant deleted successfully"}), 200 