import json
import redis
from utils.socket_utils import emit_slide_change
import utils.s3_utils as s3_utils

# Initialize Redis connection
redis_client = redis.Redis(host='localhost', port=6379, db=0)


def get_slides(course_id, username):
    # Load slides based on course_id instead of hardcoded path
    slides_data = s3_utils.get_json_from_s3("jasmintechs-tutorion",
                                            s3_utils.get_s3_file_path(username, course_id, "slides.json"))
    return slides_data


def get_current_slide(assistant_id):
    # Get current slide position for this specific user/session
    position = redis_client.get(f"slide_position:{assistant_id}")
    return int(position) if position else 0


def set_current_slide(assistant_id, position):
    # Store position in Redis with 24-hour expiry
    redis_client.setex(f"slide_position:{assistant_id}", 86400, position)


def update_viewing_slide(assistant_id, position):
    """Store the slide position the user is currently viewing"""
    print(f"Updating viewing slide position for {assistant_id} to {position}")
    redis_client.setex(f"viewing_slide_position:{assistant_id}", 86400, position) 

def go_to_next_slide(assistant_id, course_id, username):
    print(f"Going to next slide for {assistant_id}")
    slides = get_slides(course_id, username)
    if not slides:
        return "No slides found for this course."
    current_position = get_current_slide(assistant_id)

    # Increment position
    new_position = current_position + 1
    if new_position < len(slides):
        set_current_slide(assistant_id, new_position)
        # Emit event to frontend via Socket.IO
        emit_slide_change(assistant_id, new_position)
        return "Here is the transcript you would like to read for the next slide: " + slides[new_position]['transcript']
    else:
        return "You're already at the last slide."


def go_to_previous_slide(assistant_id, course_id, username):
    print(f"Going to previous slide for {assistant_id}")
    slides = get_slides(course_id, username)
    if not slides:
        return "No slides found for this course."
    current_position = get_current_slide(assistant_id)

    # Decrement position
    new_position = max(0, current_position - 1)
    if current_position > 0:
        set_current_slide(assistant_id, new_position)
        # Emit event to frontend via Socket.IO
        emit_slide_change(assistant_id, new_position)
        return "Here is the transcript you would like to read for the previous slide: " + slides[new_position]['transcript']
    else:
        return "You're already at the first slide."


def go_to_specified_slide(assistant_id, course_id, username, slide_number):
    slide_number -= 1  # Adjust for 0-based index
    print(f"Going to slide {slide_number} for {assistant_id}")
    slides = get_slides(course_id, username)
    if not slides:
        return "No slides found for this course."
    if slide_number < 0 or slide_number >= len(slides):
        return "Invalid slide number."
    set_current_slide(assistant_id, slide_number)
    emit_slide_change(assistant_id, slide_number)
    return "Here is the transcript you would like to read for the specified slide: " + slides[slide_number]['transcript']


def go_to_viewing_slide(assistant_id, course_id, username):
    print(f"Going to viewing slide for {assistant_id}")
    slides = get_slides(course_id, username)
    if not slides:
        return "No slides found for this course."
        
    # Get the viewing slide position
    viewing_position = redis_client.get(f"viewing_slide_position:{assistant_id}")
    viewing_position = int(viewing_position) if viewing_position else 0
    
    # Update the assistant's current slide position
    set_current_slide(assistant_id, viewing_position)
    
    # Emit event to frontend via Socket.IO
    emit_slide_change(assistant_id, viewing_position)
    
    return "Here is the transcript for the slide you're currently viewing: " + slides[viewing_position]['transcript']


def go_to_starting_slide(assistant_id, course_id, username):
    print(f"Going to starting slide for {assistant_id}")
    slides = get_slides(course_id, username)
    if not slides:
        return "No slides found for this course."
    
    # Get the last saved position from S3
    starting_position = s3_utils.get_assistant_last_position(username, course_id)
    
    # Ensure position is valid for this course
    if starting_position >= len(slides):
        starting_position = 0  # Default to first slide if position is invalid
    
    # Save the current position in Redis
    set_current_slide(assistant_id, starting_position)
    
    # Emit event to frontend via Socket.IO
    emit_slide_change(assistant_id, starting_position)
    
    # Return customized message based on whether we're starting from beginning or resuming
    if starting_position == 0:
        return f"Welcome to this course. Let's start with the first slide: {slides[starting_position]['transcript']}"
    else:
        return f"Welcome back to the course. Let's continue from where you left off. Slide {starting_position + 1}: {slides[starting_position]['transcript']}"

