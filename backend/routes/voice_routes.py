from flask import Blueprint, request, jsonify, send_file
import edge_tts
import asyncio
import os
import tempfile
import openai
voice_bp = Blueprint('voice', __name__)
AUDIO_DIR = "audio_cache"
os.makedirs(AUDIO_DIR, exist_ok=True)

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
@voice_bp.route('/api/list-voices', methods=['GET'])
def list_voices():
    try:
        voices = asyncio.run(edge_tts.list_voices())
        return jsonify(voices)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@voice_bp.route('/api/generate-audio', methods=['POST'])
def generate_audio():  # Remove async
    data = request.json
    text = data.get("text", "")
    voice = data.get("voice", "en-US-AvaMultilingualNeural")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # File path
    audio_file = os.path.join(AUDIO_DIR, "output.mp3")
    try:
        # Wrap the async operations in asyncio.run()
        async def generate():
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(audio_file)
        
        asyncio.run(generate())
        return send_file(audio_file, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@voice_bp.route('/api/recognize-openai', methods=['POST'])
def recognize_with_openai():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio_file = request.files['audio']

    try:
        # Save the audio file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            audio_path = temp_file.name
            audio_file.save(audio_path)

        # Use OpenAI Whisper API
        with open(audio_path, "rb") as file:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=file,
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"]
            )

        print(f"response: {response}")

        # Clean up the temporary file
        os.remove(audio_path)

        print(f"user prompt: {response.text}")

        # Return the transcription text
        return jsonify({"text": response.text})
    except Exception as e:
        print(f"Error in recognize_with_openai: {str(e)}")
        return jsonify({"error": str(e)}), 500 