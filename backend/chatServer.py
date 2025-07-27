import tiktoken
import openai
import faiss
import numpy as np
from difflib import SequenceMatcher  # For fuzzy matching
import time
import os
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

import tempfile
import os
import edge_tts
import asyncio

class ContextManager:
    def __init__(self, context_file="./uploads/context.txt"):
        self.context_file = context_file
        self.chunks = []
        self.inverted_index = {}
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.faiss_index = None
        self.load_and_process_context()

    def split_into_chunks(self, text: str, max_tokens: int = 2000) -> list:
        """Split text into smaller chunks based on token count."""
        encoder = tiktoken.encoding_for_model("gpt-4")
        chunks = []
        current_chunk = []
        current_token_count = 0

        for line in text.split('\n'):
            line_tokens = len(encoder.encode(line + '\n'))
            if current_token_count + line_tokens > max_tokens:
                if current_chunk:
                    chunks.append('\n'.join(current_chunk))
                current_chunk = [line]
                current_token_count = line_tokens
            else:
                current_chunk.append(line)
                current_token_count += line_tokens

        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        return chunks

    def load_and_process_context(self):
        """Load context file, process into chunks, build FAISS index and inverted index."""
        try:
            start_time = time.time()

            with open(self.context_file, 'r', encoding='utf-8') as file:
                content = file.read()

            chunk_time = time.time()
            self.chunks = self.split_into_chunks(content)
            print(f"Chunking time: {time.time() - chunk_time:.2f} seconds")

            faiss_time = time.time()
            self.build_faiss_index()
            print(f"FAISS index build time: {time.time() - faiss_time:.2f} seconds")

            inverted_index_time = time.time()
            self.build_inverted_index()
            print(f"Inverted index build time: {time.time() - inverted_index_time:.2f} seconds")

            print(f"Total context processing time: {time.time() - start_time:.2f} seconds")

        except Exception as e:
            print(f"Error processing context file: {str(e)}")
            self.chunks = []

    def build_inverted_index(self):
        """Build an inverted index for quotes and important phrases."""
        for i, chunk in enumerate(self.chunks):
            quotes = self.extract_quotes_from_chunk(chunk)
            for quote in quotes:
                self.inverted_index[quote.lower()] = i

    def extract_quotes_from_chunk(self, chunk):
        """Extract well-known phrases or quotes from a chunk for indexing."""
        return [line for line in chunk.split('\n') if line.startswith('"')]

    def find_approximate_quote_match(self, query: str, threshold=0.7):
        """Find the closest quote in the inverted index based on similarity threshold."""
        best_match = None
        best_score = 0
        query_lower = query.lower()

        for quote, index in self.inverted_index.items():
            similarity = SequenceMatcher(None, query_lower, quote).ratio()
            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = self.chunks[index]

        return best_match

    def get_relevant_chunks(self, query: str, max_chunks: int = 5) -> str:
        """Retrieve the most relevant chunks based on user query using inverted index, fuzzy matching, and FAISS."""
        query_time = time.time()

        # Step 1: Check for exact match in inverted index
        normalized_query = query.lower()
        if normalized_query in self.inverted_index:
            exact_match_time = time.time()
            chunk_index = self.inverted_index[normalized_query]
            print(f"Exact match time: {time.time() - exact_match_time:.2f} seconds")
            print(f"Total query processing time: {time.time() - query_time:.2f} seconds")
            return self.chunks[chunk_index]

        # Step 2: Fuzzy match for approximate quotes (case-insensitive)
        fuzzy_time = time.time()
        approximate_match = self.find_approximate_quote_match(normalized_query)
        print(f"Fuzzy matching time: {time.time() - fuzzy_time:.2f} seconds")
        if approximate_match:
            print(f"Total query processing time: {time.time() - query_time:.2f} seconds")
            return approximate_match

        # Step 3: Fall back to FAISS if no exact or approximate match is found
        faiss_search_time = time.time()
        try:
            query_embedding = self.client.embeddings.create(
                model="text-embedding-3-large",
                input=query
            ).data[0].embedding
            query_embedding_np = np.array(query_embedding).astype('float32').reshape(1, -1)

            _, indices = self.faiss_index.search(query_embedding_np, max_chunks)
            relevant_chunks = "\n\n".join([self.chunks[i] for i in indices[0]])
            print(f"FAISS search time: {time.time() - faiss_search_time:.2f} seconds")
            print(f"Total query processing time: {time.time() - query_time:.2f} seconds")
            return relevant_chunks

        except Exception as e:
            print(f"Error getting relevant chunks: {str(e)}")
            return self.chunks[0] if self.chunks else ""

    def build_faiss_index(self):
        """Build a FAISS index with precomputed embeddings of chunks."""
        embeddings = []
        for chunk in self.chunks:
            try:
                embedding = self.client.embeddings.create(
                    model="text-embedding-3-large",
                    input=chunk
                ).data[0].embedding
                embeddings.append(embedding)
            except Exception as e:
                print(f"Error generating embedding: {str(e)}")
                embeddings.append([0] * 3072)

        embeddings_np = np.array(embeddings).astype('float32')

        # Initialize FAISS index with the large vector size
        dimension = embeddings_np.shape[1]
        self.faiss_index = faiss.IndexFlatL2(dimension)
        self.faiss_index.add(embeddings_np)

class builtContext:
    def __init__(self):
        #XXXX
        print("Creating builtContext with its own ContextManager")
        self.context_manager = ContextManager()


class ChatBot:
    def __init__(self, context_manager=None, conversation_history=None):
        if context_manager is None:
            print("No ContextManager provided, creating a new one")
            self.context_manager = ContextManager()
        else:
            print("Using provided ContextManager")
            self.context_manager = context_manager
        # Use provided conversation history or create new one
        self.conversation_history = conversation_history if conversation_history is not None else []

    def process_message(self, message: str) -> str:
        """Process a single message and return the response."""
        try:
            relevant_context = self.context_manager.get_relevant_chunks(message)
            messages = [
                {"role": "system", 
                 "content": '''You are my lecturer for university course study. Don't ask students what to do, instead you can ask if the students is ready, and then you can start your lesson. You are here to teach my reading. Don't speak too much content each time.''' + f"Relevant context:\n{relevant_context}"}
            ]
            messages.extend(self.conversation_history)
            messages.append({"role": "user", "content": message})

            response = self.context_manager.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=100,
                temperature=0.9
            )

            ai_content = response.choices[0].message.content
            self.conversation_history.append({"role": "user", "content": message})
            self.conversation_history.append({"role": "assistant", "content": ai_content})

            return ai_content

        except Exception as e:
            print(f"Error in process_message: {str(e)}")
            return "An error occurred while processing your request."


app = Flask(__name__)
# Configure CORS to allow requests from your frontend
CORS(app, resources={
    r"/*": {  # Changed from r"/api/*" to r"/*"
        "origins": ["http://localhost:3000"],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

conversation_history = []

# API Endpoint for handling user input
@app.route('/api/get-ai-response', methods=['POST'])
def get_ai_response():
    print("\nCreating ChatBot with built_context.context_manager")
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        user_input = data.get('input')
        thread_id = data.get('thread_id', 'default_thread')  # Support multiple threads by using a thread ID
        if not user_input:
            return jsonify({'error': 'No input provided'}), 400
        
        # Pass the global conversation history to ChatBot
        chat = ChatBot(built_context.context_manager, conversation_history)

        response = chat.process_message(user_input)
        print("\nAssistant:", response)

        # Return response as JSON
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"Error in get_ai_response: {str(e)}")
        return jsonify({'error': str(e)}), 500

    
    
# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/upload-files', methods=['POST'])
def upload_files():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files part'}), 400

        files = request.files.getlist('files')  # Retrieve the list of files
        if not files:
            return jsonify({'error': 'No files selected'}), 400

        uploaded_files = []
        for file in files:
            if file.filename:
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)  # Save the file to the server
                uploaded_files.append(filename)

                # Optionally, read and process .txt files
                if filename.endswith('.txt'):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        print(f"Content of {filename}:\n{content}")

        return jsonify({
            'message': 'Files uploaded successfully',
            'files': uploaded_files
        }), 200

    except Exception as e:
        print(f"Error during file upload: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/delete-file', methods=['POST'])
def delete_file():
    try:
        data = request.json
        filename = data.get('filename')

        if not filename:
            return jsonify({'error': 'Filename is required'}), 400

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'message': 'File deleted successfully'})
        else:
            return jsonify({'error': 'File not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/customize', methods=['POST'])
def customize_course():
    try:
        data = request.json
        title = data.get('title')
        ai_tutor_name = data.get('aiTutor', {}).get('name')
        personality = data.get('personality')
        selected_days = data.get('selectedDays')
        session_duration = data.get('sessionDuration')
        start_date = data.get('startDate')
        end_date = data.get('endDate')

        print(f"Customizing course: {title}")
        print(f"AI Tutor: {ai_tutor_name}, Personality: {personality}")
        print(f"Course Duration: {start_date} to {end_date}")
        print(f"Selected Days: {selected_days}, Session Duration: {session_duration} minutes")

        # Add logic to store or process the customization data here

        return jsonify({'message': 'Course customized successfully'}), 200
    except Exception as e:
        print(f"Error in customize_course: {str(e)}")
        return jsonify({'error': str(e)}), 500


 
@app.route('/api/list-voices', methods=['GET'])
def list_voices():
    try:
        voices = asyncio.run(edge_tts.list_voices())  # Use asyncio.run for asynchronous calls
        return jsonify(voices)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-audio', methods=['POST'])
async def generate_audio():
    data = request.json  # Do not use await with Flask
    text = data.get("text", "")
    voice = data.get("voice", "en-US-AvaMultilingualNeural")  # Default voice

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # File path
    audio_file = os.path.join(AUDIO_DIR, "output.mp3")
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(audio_file)  # Await is still required for async edge_tts
        return send_file(audio_file, as_attachment=True)  # No await for send_file
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recognize-openai', methods=['POST'])
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
                file=file
            )

        # Clean up the temporary file
        os.remove(audio_path)

        print(f"response: {response.text}")

        # Return the transcription text
        return jsonify({"text": response.text})
    except Exception as e:
        print(f"Error in recognize_with_openai: {str(e)}")
        return jsonify({"error": str(e)}), 500

    
if __name__ == '__main__':
    built_context = builtContext()
    app.run(debug=True) 