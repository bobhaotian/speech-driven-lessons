from flask import Blueprint, request, jsonify
import utils.s3_utils as s3_utils
import functions.get_detailed_content as get_detailed_content
import functions.slides_navigation as slides_navigation

webhook = Blueprint('webhook', __name__)


@webhook.route('/', methods=['POST'])
async def webhook_route():
    # Add your logic here

    request_data = request.get_json()
    payload = request_data.get('message')

    if payload['type'] == "function-call":
        response = await function_call_handler(payload)
        return jsonify(response), 201
    elif payload['type'] == "status-update":
        response = await status_update_handler(payload)
        return jsonify(response), 201
    elif payload['type'] == "speech-update":
        print("speech-update called")
        response = speech_update_handler(payload)
        return jsonify(response), 201
    elif payload['type'] == "conversation-update":
        print("conversation-update called")
        response = await conversation_update_handler(payload)
        return jsonify(response), 201
    elif payload['type'] == "assistant-request":
        response = await assistant_request_handler(payload)
        return jsonify(response), 201
    elif payload['type'] == "end-of-call-report":
        await end_of_call_report_handler(payload)
        return jsonify({}), 201
    elif payload['type'] == "transcript":
        response = await transcript_handler(payload)
        return jsonify(response), 201
    elif payload['type'] == "hang":
        response = await hang_event_handler(payload)
        return jsonify(response), 201
    else:
        return jsonify({}), 201


async def function_call_handler(payload):
    """
    Handle Business logic here.
    You can handle function calls here. The payload will have function name and parameters.
    You can trigger the appropriate function based on your requirements and configurations.
    You can also have a set of validators along with each function which can be used to first validate the parameters and then call the functions.
    Here Assumption is that the functions are handling the fallback cases as well. They should return the appropriate response in case of any error.
    """

    # print(payload)

    function_call = payload.get('functionCall')

    if not function_call:
        raise ValueError("Invalid Request.")

    name = function_call.get('name')
    parameters = function_call.get('parameters')

    assistant_id = payload.get("assistant", {}).get("id")

    print(f"{assistant_id} - {name} - {parameters}")

    user_course_data = s3_utils.load_assistant_user_from_s3(assistant_id)

    print(user_course_data)

    print(f"function call handler called: {name} - {parameters}")

    if name == 'getDetailedContent':
        context = get_detailed_content.get_detailed_content(user_course_data['course_id'],
                                                           user_course_data['username'],
                                                           parameters['userQuery'])
        return context
    elif name == 'goToStartingSlide':
        context = slides_navigation.go_to_starting_slide(
            assistant_id, 
            user_course_data['course_id'],
            user_course_data['username']
        )
        return context
    elif name == 'goToNextSlide':
        context = slides_navigation.go_to_next_slide(
            assistant_id, 
            user_course_data['course_id'],
            user_course_data['username']
        )
        return context
    elif name == 'goToPreviousSlide':
        context = slides_navigation.go_to_previous_slide(
            assistant_id, 
            user_course_data['course_id'],
            user_course_data['username']
        )
        return context
    elif name == "goToSpecifiedSlide":
        context = slides_navigation.go_to_specified_slide(
            assistant_id,
            user_course_data['course_id'],
            user_course_data['username'],
            parameters['slideNumber']
        )
        return context
    elif name == "goToViewingSlide":
        context = slides_navigation.go_to_viewing_slide(
            assistant_id,
            user_course_data['course_id'],
            user_course_data['username']
        )
        return context
    else:
        return None


async def status_update_handler(payload):
    """
    Handle Business logic here.
    Sent during a call whenever the status of the call has changed.
    Possible statuses are: "queued","ringing","in-progress","forwarding","ended".
    You can have certain logic or handlers based on the call status.
    You can also store the information in your database. For example whenever the call gets forwarded.
    """
    return {}


def speech_update_handler(payload):
    """
    Handle Business logic here.
    Sent during a call whenever the status of the call has changed.
    Possible statuses are: "queued","ringing","in-progress","forwarding","ended".
    You can have certain logic or handlers based on the call status.
    You can also store the information in your database. For example whenever the call gets forwarded.
    """
    # print(payload)
    # with open('speech_update.txt', 'a') as f:
    #     f.write(payload["message"]["artifact"]["messages"])
    # print(payload["artifact"]["messages"][-1]["message"])

    return {}


async def conversation_update_handler(payload):
    """
    Handle Business logic here.
    Sent during a call whenever the conversation is updated.
    You can store the conversation in your database or have some other business logic.
    """
    print("conversation_update_handler called")
    print(payload['conversation'][-1]['content'])
    return {}


async def end_of_call_report_handler(payload):
    """
    Handle Business logic here.
    You can store the information like summary, typescript, recordingUrl or even the full messages list in the database.
    """
    return


async def transcript_handler(payload):
    """
    Handle Business logic here.
    Sent during a call whenever the transcript is available for certain chunk in the stream.
    You can store the transcript in your database or have some other business logic.
    """
    return


async def hang_event_handler(payload):
    """
    Handle Business logic here.
    Sent once the call is terminated by user.
    You can update the database or have some followup actions or workflow triggered.
    """
    return


async def assistant_request_handler(payload):
    """
    Handle Business logic here.
    You can fetch your database to see if there is an existing assistant associated with this call. If yes, return the assistant.
    You can also fetch some params from your database to create the assistant and return it.
    You can have various predefined static assistant here and return them based on the call details.
    """

    if payload and 'call' in payload:
        assistant = {
            'name': 'Paula',
            'model': {
                'provider': 'openai',
                'model': 'gpt-3.5-turbo',
                'temperature': 0.7,
                'systemPrompt': "You're Paula, an AI assistant who can help user draft beautiful emails to their clients based on the user requirements. Then Call sendEmail function to actually send the email.",
                'functions': [
                    {
                        'name': 'sendEmail',
                        'description': 'Send email to the given email address and with the given content.',
                        'parameters': {
                            'type': 'object',
                            'properties': {
                                'email': {
                                    'type': 'string',
                                    'description': 'Email to which we want to send the content.'
                                },
                                'content': {
                                    'type': 'string',
                                    'description': 'Actual Content of the email to be sent.'
                                }
                            },
                            'required': ['email']
                        }
                    }
                ]
            },
            'voice': {
                'provider': '11labs',
                'voiceId': 'paula'
            },
            'firstMessage': "Hi, I'm Paula, your personal email assistant."
        }
        return {'assistant': assistant}

    raise ValueError('Invalid call details provided.')
