import openai
from s3_context_manager import ContextManager as S3ContextManager
import re
import json

class ChatBot:
    def __init__(self, context_manager, conversation_history=None, api_key=None):
        if not api_key:
            raise ValueError("API key must be provided.")

        openai.api_key = api_key
        self.api_key = api_key
        self.context_manager = context_manager
        self.conversation_history = conversation_history if conversation_history is not None else []
        self.system_prompt = '''You are my lecturer for university course study. Don't ask students what to do, instead you can ask if the students is ready, and then you can start your lesson. You are here to teach my reading. Don't speak too much content each time.'''

    def update_system_prompt(self, new_prompt: str):
        """
        Update the system prompt dynamically.

        Args:
            new_prompt (str): The new system prompt to be set.
        """
        if not new_prompt.strip():
            print("Warning: New system prompt is empty. Keeping the existing prompt.")
            return
        self.system_prompt = new_prompt

    def get_system_prompt(self):
        """
        Get the current system prompt.

        Returns:
            str: The current system prompt.
        """
        return self.system_prompt

    '''
    def process_message(self, message: str) -> str:
        """Process a single message and return the response."""
        try:
            relevant_context = self.context_manager.get_relevant_chunks(message)
            messages = [
                {"role": "system",
                 "content": f"{self.system_prompt} Relevant context:\n{relevant_context}"}
            ]
            messages.extend(self.conversation_history)
            messages.append({"role": "user", "content": message})

            response = self.context_manager.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=300,
                temperature=0.9
            )

            ai_content = response.choices[0].message.content
            self.conversation_history.append({"role": "user", "content": message})
            self.conversation_history.append({"role": "assistant", "content": ai_content})

            return ai_content

        except Exception as e:
            print(f"Error in process_message: {str(e)}")
            return "An error occurred while processing your request."
    '''

    # def process_message(self, message: str) -> dict:
    #     """Process a single message and return structured response."""
    #     try:
    #         relevant_context = self.context_manager.get_relevant_chunks(message)
    #         messages = [
    #             {"role": "system",
    #              "content": f"{self.system_prompt} Relevant context:\n{relevant_context}"}
    #         ]
    #         messages.extend(self.conversation_history)
    #         messages.append({"role": "user", "content": message})

    #         response = self.context_manager.client.chat.completions.create(
    #             model="gpt-4o",
    #             messages=messages,
    #             max_tokens=100,
    #             temperature=0.9
    #         )
            
    #         ai_content = response.choices[0].message.content
            
    #         # Check token count
    #         if len(ai_content.split()) < 30:  # Approximate 100 tokens
    #             return {
    #                 "type": "slides",
    #                 "message": ai_content,
    #                 "slides": []
    #             }
            
    #         client1 = openai.OpenAI(api_key=self.api_key)  # Add this line
    #         messages_slide = [
    #             {"role": "system",
    #             "content": f"Format the response {ai_content} as a presentation with slides. Each slide should have a title and content. Use '---' to separate slides. Example format:\n{{\"slides\": [{{\"title\": \"Introduction\", \"content\": \"Main points...\"}}]}}"}
    #         ]
    #         response_slide = client1.chat.completions.create(
    #             model="gpt-4o",
    #             messages=messages_slide,
    #             max_tokens=100,
    #             temperature=0.5
    #         )
            
    #         slide_content = response_slide.choices[0].message.content
    #         # Parse the content into slides format
    #         slides = []
            
    #         try:
    #             # First try to parse as JSON
    #             import json
    #             parsed_content = json.loads(slide_content)
    #             if "slides" in parsed_content:
    #                 slides = parsed_content["slides"]
    #         except json.JSONDecodeError:
    #             # Fallback to parsing with split if JSON parsing fails
    #             raw_slides = slide_content.split('---')
    #             for slide in raw_slides:
    #                 parts = slide.strip().split('\n', 1)
    #                 if len(parts) == 2:
    #                     title = parts[0].strip('# ').strip()
    #                     content = parts[1].strip()
    #                     slides.append({
    #                         "title": title,
    #                         "content": content
    #                     })

    #         structured_response = {
    #             "type": "slides",
    #             "message": ai_content,
    #             "slides": slides
    #         }

    #         self.conversation_history.append({"role": "user", "content": message})
    #         self.conversation_history.append({"role": "assistant", "content": ai_content})

    #         return structured_response

    #     except Exception as e:
    #         print(f"Error in process_message: {str(e)}")
    #         return {
    #             "type": "error",
    #             "message": "An error occurred while processing your request."
    #         }
    # @staticmethod
    # def parse_slides(content: str) -> list:
    #     lines = content.split('\n')
    #     main_title = ""
    #     slides = []
    #     current_slide = None
    #     current_content = []

    #     # Skip until we find the first "# " header.
    #     lines_iter = iter(lines)
    #     for line in lines_iter:
    #         if line.startswith("# "):
    #             main_title = line[2:].strip()
    #             break

    #     # Parse subsequent lines for "##" subtitles and content.
    #     for line in lines_iter:
    #         if line.startswith("## "):
    #             # Finalize the previous slide when encountering a new subtitle.
    #             if current_slide is not None:
    #                 current_slide['content'] = "\n".join(current_content).strip()
    #                 slides.append(current_slide)
    #                 current_content = []
    #             subtitle = line[3:].strip()
    #             # Merge main title and subtitle for the slide title.
    #             title = f"{main_title} - {subtitle}" if main_title else subtitle
    #             current_slide = {'title': title, 'content': ""}
    #         else:
    #             # Collect content lines for the current slide.
    #             if current_slide is not None:
    #                 current_content.append(line)

    #     if current_slide:
    #         current_slide['content'] = "\n".join(current_content).strip()
    #         slides.append(current_slide)

    #     return slides
    @staticmethod
    def parse_slides(content: str) -> list:
        lines = content.split('\n')
        slides = []
        current_slide = None
        current_content = []
        in_code_block = False
        code_block_content = []
        content_before_first_heading = []
        content_after_primary = []
        floating_code_blocks = []

        print("DEBUG: Starting parse_slides")

        # First detect heading types and if there's any code block before first heading
        heading_types = set()
        found_first_heading = False
        code_blocks_before_heading = []
        current_code_block = []
        in_code_before_heading = False

        # First pass remains the same for detecting heading types
        for line in lines:
            if line.strip().startswith('```'):
                if not in_code_before_heading:
                    in_code_before_heading = True
                    if line.strip() != '```':
                        current_code_block.append(line)
                else:
                    in_code_before_heading = False
                    current_code_block.append(line)
                    if not found_first_heading:
                        code_blocks_before_heading.append('\n'.join(current_code_block))
                    current_code_block = []
            elif in_code_before_heading:
                current_code_block.append(line)
            elif line.strip().startswith('#'):
                found_first_heading = True
                heading_count = len(line) - len(line.lstrip('#'))
                if heading_count > 0 and heading_count <= 6:
                    heading_types.add(heading_count)
            elif not found_first_heading:
                content_before_first_heading.append(line)

        print(f"DEBUG: Heading types found: {heading_types}")
        if not heading_types:
            return [{"title": "Slide", "content": content.strip()}]

        heading_types = sorted(list(heading_types))
        primary_level = heading_types[0]
        secondary_level = heading_types[1] if len(heading_types) > 1 else None

        print(f"DEBUG: Primary level: {primary_level}, Secondary level: {secondary_level}")

        # If only one heading level, combine everything into one slide
        if secondary_level is None:
            # Get the first heading as the title
            first_heading = None
            for line in lines:
                if line.strip().startswith('#' * primary_level + ' '):
                    first_heading = line[primary_level + 1:].strip()
                    break
            return [{
                "title": first_heading or "Slide",
                "content": content.strip()
            }]

        # Rest of your existing code for multiple heading levels...
        current_primary_title = ""
        found_first_secondary = False
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Handle code blocks - always capture them
            if line.startswith('```'):
                if not in_code_block:
                    in_code_block = True
                    code_block_content = []
                    if line.strip() != '```':
                        code_block_content.append(line)
                else:
                    in_code_block = False
                    code_block_content.append(line)
                    code_block = '\n'.join(code_block_content)
                    if current_slide is not None:
                        # If we're in a slide, add the code block to current content
                        current_content.append(code_block)
                    elif current_primary_title and not found_first_secondary:
                        # If we're between primary and secondary, add to primary content
                        content_after_primary.append(code_block)
                    else:
                        # If we're between sections, store as floating code block
                        floating_code_blocks.append(code_block)
            elif in_code_block:
                code_block_content.append(lines[i])
            else:
                # Handle primary level headings
                if line.startswith('#' * primary_level + ' '):
                    # If there are floating code blocks, add them to the previous slide
                    if floating_code_blocks and slides:
                        last_slide = slides[-1]
                        if last_slide['content']:
                            last_slide['content'] += '\n\n' + '\n\n'.join(floating_code_blocks)
                        else:
                            last_slide['content'] = '\n\n'.join(floating_code_blocks)
                        floating_code_blocks.clear()
                    
                    current_primary_title = line[primary_level + 1:].strip()
                    print(f"DEBUG: Found primary title: {current_primary_title}")
                
                # Handle secondary level headings
                elif secondary_level and line.startswith('#' * secondary_level + ' '):
                    subtitle = line[secondary_level + 1:].strip()
                    title = f"{current_primary_title} - {subtitle}" if current_primary_title else subtitle
                    print(f"DEBUG: Found secondary title: {subtitle}")
                    
                    if current_slide:
                        # Add any floating code blocks to current slide before creating new one
                        if floating_code_blocks:
                            if current_content:
                                current_content.extend([''] + floating_code_blocks)
                            else:
                                current_content = floating_code_blocks.copy()
                            floating_code_blocks.clear()
                        
                        current_slide['content'] = '\n'.join(current_content).strip()
                        slides.append(current_slide)
                    
                    # For the first slide, include code blocks from before first heading
                    if not found_first_secondary:
                        all_initial_content = []
                        if code_blocks_before_heading:
                            all_initial_content.extend(code_blocks_before_heading)
                        if content_after_primary:
                            all_initial_content.extend(content_after_primary)
                        if floating_code_blocks:
                            all_initial_content.extend(floating_code_blocks)
                            floating_code_blocks.clear()
                        
                        current_slide = {
                            'title': title,
                            'content': '\n\n'.join(all_initial_content).strip()
                        }
                    else:
                        current_slide = {
                            'title': title,
                            'content': ''
                        }
                    current_content = []
                    found_first_secondary = True
                
                # Handle content
                elif line or (not line and current_content):
                    if current_slide is not None:
                        current_content.append(line)
                    elif current_primary_title and not found_first_secondary:
                        content_after_primary.append(line)
            
            i += 1

        # Add the last slide
        if current_slide:
            if floating_code_blocks:
                if current_content:
                    current_content.extend([''] + floating_code_blocks)
                else:
                    current_content = floating_code_blocks.copy()
            current_slide['content'] = '\n'.join(current_content).strip()
            slides.append(current_slide)

        print(f"DEBUG: Final slides: {slides}")
        return slides
    


                
    def process_message(self, message: str) -> dict:
        """Process a single message and return structured response."""
        try:
            relevant_context = self.context_manager.get_relevant_chunks(message)
            messages = [
                {"role": "system",
                "content": f"{self.system_prompt} Relevant context:\n{relevant_context}"}
            ]
            messages.extend(self.conversation_history)
            messages.append({"role": "user", "content": message})

            response = self.context_manager.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=10000,
                temperature=1.02
                #ft:gpt-4o-2024-08-06:personal::AqZJVNG7
            )

            ai_content = response.choices[0].message.content

            # If response is too short, return simple response without slides
            if len(ai_content.split()) < 30:
                return {
                    "type": "slides",
                    "message": ai_content,
                    "slides": []
                }

            # Use the improved parse_slides method to split content into slides.
            slides = self.parse_slides(ai_content)

            structured_response = {
                "type": "slides",
                "message": ai_content,
                "slides": slides
            }
            
            # Debugging the structured_response
            print("DEBUG: Structured Response:", structured_response)
            
            self.conversation_history.append({"role": "user", "content": message})
            self.conversation_history.append({"role": "assistant", "content": ai_content})

            return structured_response

        except Exception as e:
            print(f"Error in process_message: {str(e)}")
            return {
                "type": "error",
                "message": "An error occurred while processing your request."
            }
