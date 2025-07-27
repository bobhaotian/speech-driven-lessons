import tiktoken
import openai
import faiss
import numpy as np
from difflib import SequenceMatcher
import time
import os
from dotenv import load_dotenv
import json
load_dotenv()

# Retrieve API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable must be set.")

class ContextManager:
    def __init__(self, uploads_dir="../uploads", api_key=None):
        if not api_key:
            raise ValueError("API key must be provided.")
        openai.api_key = api_key

        self.base_uploads_dir = uploads_dir  # Store the base uploads directory
        self.uploads_dir = uploads_dir
        self.chunks = []
        self.inverted_index = {}
        self.faiss_index = None
        self.client = openai.OpenAI(api_key=API_KEY, base_url='https://api.jpgpt.online/v1/chat/completions')
        self.client_embedding = openai.OpenAI(api_key=API_KEY, base_url="https://api.jpgpt.online/v1/embeddings")

    def split_into_chunks(self, text: str, max_tokens: int = 2300) -> list:
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

    def _load_text_files(self):
        """Read and combine text from all .txt files in the uploads directory."""
        all_text = ""
        try:
            for file_name in os.listdir(self.uploads_dir):
                if file_name.endswith(".txt"):
                    file_path = os.path.join(self.uploads_dir, file_name)
                    print(f"Reading file: {file_name}")
                    with open(file_path, 'r', encoding='utf-8') as file:
                        all_text += file.read() + "\n"
        except Exception as e:
            print(f"Error reading files: {str(e)}")
        return all_text

    def load_and_process_context(self, title=None):
        """Load context file, process into chunks, build FAISS index and inverted index."""
        try:
            start_time = time.time()

            # Update uploads_dir if title is provided
            if title:
                self.uploads_dir = os.path.join(self.base_uploads_dir, title)
                os.makedirs(self.uploads_dir, exist_ok=True)

            all_text = self._load_text_files()
            if not all_text.strip():
                raise ValueError("No valid text found in uploaded files.")

            chunk_time = time.time()
            self.chunks = self.split_into_chunks(all_text)
            # Save chunks
            with open(os.path.join(self.uploads_dir, 'chunks.json'), 'w', encoding='utf-8') as f:
                json.dump(self.chunks, f, ensure_ascii=False, indent=2)
            print(f"Chunking time: {time.time() - chunk_time:.2f} seconds")

            faiss_time = time.time()
            self.build_faiss_index()
            # Save FAISS index
            faiss.write_index(self.faiss_index, os.path.join(self.uploads_dir, 'faiss.index'))
            print(f"FAISS index build time: {time.time() - faiss_time:.2f} seconds")

            inverted_index_time = time.time()
            self.build_inverted_index()
            # Save inverted index
            with open(os.path.join(self.uploads_dir, 'inverted_index.json'), 'w', encoding='utf-8') as f:
                json.dump(self.inverted_index, f, ensure_ascii=False, indent=2)
            print(f"Inverted index build time: {time.time() - inverted_index_time:.2f} seconds")

            print(f"Total context processing time: {time.time() - start_time:.2f} seconds")

        except Exception as e:
            print(f"Error processing context file: {str(e)}")
            self.chunks = []

    def load_and_process_context_by_path(self, course_path=None):
        """Load context file, process into chunks, build FAISS index and inverted index."""
        try:
            start_time = time.time()

            # Update uploads_dir if title is provided
            if course_path:
                self.uploads_dir = course_path
                os.makedirs(self.uploads_dir, exist_ok=True)

            all_text = self._load_text_files()
            if not all_text.strip():
                raise ValueError("No valid text found in uploaded files.")

            chunk_time = time.time()
            self.chunks = self.split_into_chunks(all_text)
            # Save chunks
            with open(os.path.join(self.uploads_dir, 'chunks.json'), 'w', encoding='utf-8') as f:
                json.dump(self.chunks, f, ensure_ascii=False, indent=2)
            print(f"Chunking time: {time.time() - chunk_time:.2f} seconds")

            faiss_time = time.time()
            self.build_faiss_index()
            # Save FAISS index
            faiss.write_index(self.faiss_index, os.path.join(self.uploads_dir, 'faiss.index'))
            print(f"FAISS index build time: {time.time() - faiss_time:.2f} seconds")

            inverted_index_time = time.time()
            self.build_inverted_index()
            # Save inverted index
            with open(os.path.join(self.uploads_dir, 'inverted_index.json'), 'w', encoding='utf-8') as f:
                json.dump(self.inverted_index, f, ensure_ascii=False, indent=2)
            print(f"Inverted index build time: {time.time() - inverted_index_time:.2f} seconds")

            print(f"Total context processing time: {time.time() - start_time:.2f} seconds")

        except Exception as e:
            print(f"Error processing context file: {str(e)}")
            self.chunks = []

    def load_saved_indices(self, title):
        """Load previously processed indices and chunks for a specific course."""
        try:
            print(f"Loading saved indices for course: {title}")
            course_dir = os.path.join(self.base_uploads_dir, title)
            
            # Load chunks
            with open(os.path.join(course_dir, 'chunks.json'), 'r', encoding='utf-8') as f:
                self.chunks = json.load(f)

            # Load inverted index
            with open(os.path.join(course_dir, 'inverted_index.json'), 'r', encoding='utf-8') as f:
                self.inverted_index = json.load(f)

            # Load FAISS index
            self.faiss_index = faiss.read_index(os.path.join(course_dir, 'faiss.index'))

            return True
        except Exception as e:
            print(f"Error loading saved indices: {str(e)}")
            return False

    def build_inverted_index(self):
        """Build an inverted index for quotes and important phrases."""
        for i, chunk in enumerate(self.chunks):
            quotes = self.extract_quotes_from_chunk(chunk)
            for quote in quotes:
                self.inverted_index[quote.lower()] = i

    def extract_quotes_from_chunk(self, chunk):
        """Extract well-known phrases or quotes from a chunk for indexing."""
        return [line for line in chunk.split('\n') if line.startswith('"')]

    def find_approximate_quote_match(self, query: str, threshold=0.65):
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
        if self.faiss_index == None:
            return ""
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
            query_embedding = self.client_embedding.embeddings.create(
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