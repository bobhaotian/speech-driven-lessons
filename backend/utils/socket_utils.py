# Create this new file

# This module will hold a reference to the socketio instance
# to avoid circular imports
_socketio = None

def init_socketio(socketio_instance):
    """Initialize the socketio reference"""
    global _socketio
    _socketio = socketio_instance

def emit_slide_change(assistant_id, position):
    """Emit slide change event to a specific room"""
    if _socketio:
        _socketio.emit('slide_changed', {'position': position}, room=assistant_id)
    else:
        print("Warning: socketio not initialized yet")

def emit_assistant_activity(assistant_id):
    """Emit assistant activity event to reset inactivity timer"""
    if _socketio:
        _socketio.emit('assistant_activity', room=assistant_id)
    else:
        print("Warning: socketio not initialized yet")