from flask import Blueprint, request, jsonify
import utils.user_utils as user_utils
import utils.s3_utils as s3_utils
import os
import json
from flask_cors import cross_origin
from s3_context_manager import ContextManager as S3ContextManager
from chatbot import ChatBot
import utils.load_and_process_index as faiss_utils
from dotenv import load_dotenv

load_dotenv()

customize_bp = Blueprint('customize', __name__)

@customize_bp.route('/customize', methods=['POST'])
def customize_course():
    username = user_utils.get_current_user(request)
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        data = request.json
        course_id = data.get('id')
        title = data.get('title')
        progress = data.get('progress', 0)
        ai_tutor_name = data.get('aiTutor', {}).get('name')
        personality = data.get('aiTutor', {}).get('personality')
        selected_days = data.get('selectedDays')
        sessions_per_week = data.get('sessionsPerWeek', 0)
        session_duration = data.get('sessionDuration')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        ai_tutor = data.get('aiTutor', {})
        uploaded_files = data.get('uploadedFiles', [])

        print(f"Customizing course: {title}")
        print(f"AI Tutor: {ai_tutor_name}, Personality: {personality}")
        print(f"Course Duration: {start_date} to {end_date}")
        print(f"Selected Days: {selected_days}, Session Duration: {session_duration} minutes")

        course_info = {
            "id": course_id,
            "title": title,
            "progress": progress,
            "sessionsPerWeek": sessions_per_week,
            "sessionDuration": session_duration,
            "startDate": start_date,
            "endDate": end_date,
            "aiTutor": {
                "name": ai_tutor.get('name', ''),
                "personality": ai_tutor.get('personality', '')
            },
            "uploadedFiles": uploaded_files
        }

        s3_utils.upload_json_to_s3(course_info, "jasmintechs-tutorion",
                                   s3_utils.get_s3_file_path(username, title, "course_info.json"))

        # course_dir = os.path.join("../uploads", title)
        # os.makedirs(course_dir, exist_ok=True)
        # Generate a new system prompt dynamically
        new_system_prompt = (
            f"You are my lecturer for the course '{title}'. You have an {personality} teaching style "
            f"and are referred to as {ai_tutor_name}. "
            f"You are my lecturer for university course study. Don't ask students what to do, instead you can ask if the students is ready, and then you can start your lesson. You are here to teach. Be specific for each catogery of the content you want to talk about. Be structured for your response: if the structure of your content is A:B:C, then type #A \n ##B \n ###C. Good luck! \n"
        )
        print(f"New system prompt: {new_system_prompt}")

        course_config = {
            "system_prompt": new_system_prompt,
            "course_settings": {
                "title": title,
                "ai_tutor_name": ai_tutor_name,
                "personality": personality,
                "selected_days": selected_days,
                "session_duration": session_duration,
                "start_date": start_date,
                "end_date": end_date
            }
        }

        #XXXXX
        # config_file_path = os.path.join(course_dir, "course_config.json")
        # with open(config_file_path, 'w', encoding='utf-8') as f:
        #     json.dump(course_config, f, indent=4, ensure_ascii=False)

        config_file_path = s3_utils.get_s3_file_path(username, title, "course_config.json")
        s3_utils.upload_json_to_s3(course_config, "jasmintechs-tutorion", config_file_path)

        print(f"Course configuration saved to S3: {config_file_path}")

        # api_key = os.getenv("OPENAI_API_KEY")
        # context_manager = ContextManager(api_key=api_key)
        # chatbot = ChatBot(context_manager=context_manager, api_key=api_key)
        
        # chatbot.context_manager.load_and_process_context_by_path(course_dir)

        faiss_utils.process_course_context_s3("jasmintechs-tutorion", username, title, os.getenv("OPENAI_API_KEY"))
        print(f"Course context processed for {title} in S3.")

        return jsonify({'message': 'Course customized successfully and system prompt updated.'}), 200
    except Exception as e:
        print(f"Error in customize_course: {str(e)}")
        return jsonify({'error': str(e)}), 500

@customize_bp.route('/customize/generate-course-syllabus', methods=['POST'])
@cross_origin(supports_credentials=True)
def generate_course_materials():
    try:
        data = request.json
        course_id = data.get('course_id')  # Client must send this
        username = user_utils.get_current_user(request)
        
        if not username or not course_id:
            return jsonify({'error': 'Missing required parameters'}), 400

        # Create fresh instances
        api_key = os.getenv("OPENAI_API_KEY")
        # context_manager = ContextManager(api_key=api_key) #XXXXX
        context_manager = S3ContextManager(user=username, course_title=course_id, api_key=api_key)
        chatbot_instance = ChatBot(context_manager=context_manager, api_key=api_key)
        
        #XXXXX
        # Load course-specific context
        # user_folder = user_utils.get_user_folder("../uploads", username)
        # course_dir = os.path.join(user_folder, course_title)
        # chatbot_instance.context_manager.load_and_process_context_by_path(course_dir)
        faiss_utils.process_course_context_s3("jasmintechs-tutorion", username, course_id, os.getenv("api_key"))

        # Generate materials
        syllabus_response = chatbot_instance.process_message(
            '''Using the full text of the provided book, please ignore any pre-existing table of contents or page outlines, as they might be inaccurate. Instead, carefully parse the entire text to accurately identify the actual chapters and their corresponding content. Once you have determined the correct chapter divisions, generate a comprehensive and detailed course syllabus structured as follows:

Course Overview:

A brief introduction to the course, outlining its goals, target audience, and how it utilizes the book’s content.
Weekly/Module Breakdown:
For each chapter identified in the book, include:

Chapter Title & Number: MUST Clearly indicate the chapter number and title as parsed from the text.
Overview of Key Topics: A concise summary of the main themes and concepts covered in the chapter.
Learning Objectives: Specific objectives that students should achieve after studying the chapter.
Additional Resources: (Optional) Recommendations for further readings or multimedia resources that complement the chapter.
Overall Structure:

Ensure the syllabus follows the logical order of the chapters as they appear in the actual text.
If the number of chapters differs from a typical semester, adjust the pacing (e.g., combining chapters or extending to a longer course) to fit a coherent course timeline.
Formatting Requirements:

Use clear section headers (e.g., 'Week 1: Chapter 1 – [Chapter Title]') and bullet points where necessary.
Maintain a consistent and professional style throughout the syllabus.
Please ensure that the generated syllabus reflects the true chapter divisions determined by parsing the entire text, thereby capturing the authentic structure of the book.'''
        ).get('message', '')
        
        '''
        slides_response = chatbot_instance.process_message(
            f"Given the syllabus: {syllabus_response}..."
        ).get('message', '')
        '''
        slides_response = ""

        print(syllabus_response)

        return jsonify({
            'success': True,
            'materials': {
                'syllabus': syllabus_response,
                'slides': slides_response
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@customize_bp.route('/customize/generate-course-slides', methods=['POST'])
@cross_origin(supports_credentials=True)
def generate_course_slides():
    try:
        data = request.json
        course_id = data.get('course_id')  # Client must send this
        username = user_utils.get_current_user(request)
        
        if not username or not course_id:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        api_key = os.getenv("OPENAI_API_KEY")
        # context_manager = ContextManager(api_key=api_key) #XXXXX
        context_manager = S3ContextManager(user=username, course_title=course_id, api_key=api_key)
        chatbot_instance = ChatBot(context_manager=context_manager, api_key=api_key)
        
        # Load course-specific context
        # user_folder = user_utils.get_user_folder("../uploads", username)
        # course_dir = os.path.join(user_folder, course_id)
        
        # Load and parse the syllabus JSON file
        # syllabus_path = os.path.join(course_dir, "syllabus.json")
        # with open(syllabus_path, 'r') as f:
        #     syllabus_data = json.load(f)

        syllabus_data = s3_utils.get_json_from_s3("jasmintechs-tutorion", s3_utils.get_s3_file_path(username, course_id, "syllabus.json"))

        # if context_manager.load_saved_indices(course_dir): #XXXXX
        #     print(f"Successfully loaded saved indices for course: {course_dir}")
        # else:
        #     print(f"No saved indices found for course: {course_id}")
        #     # Optionally process context if indices don't exist
        #     context_manager.load_and_process_context_by_path(course_dir) #XXXXX

        if context_manager.load_saved_indices():  # XXXXX
            print(f"Successfully loaded saved indices for course: {course_id}")
        else:
            print(f"No saved indices found for course: {course_id}")
            # Optionally process context if indices don't exist
            faiss_utils.process_course_context_s3("jasmintechs-tutorion", username, course_id, os.getenv("api_key"))
        """
        slides_response = chatbot_instance.process_message(
            f'''You are an expert educational slide designer and content generator. Your task is to create the best, most dynamic, and beautiful markdown slides for an educational course. Each slide should be concise, engaging, and reflect current best practices.

            Syllabus:
            {syllabus_data}


            Each slide's format and structure MUST be different. 
            -------
            Here is an example format you can refer to, but remember each slide must has different format and structures:

            Title: A clear, concise statement of the subtopic.

            Key Points: A bullet list summarizing the core concepts.

            Explanation: A detailed yet succinct description that guides the learner through the concept logically.

            Visual Suggestions: Recommendations for diagrams, charts, or infographics to support the content.

            Real-World Examples: Dynamic examples or applications that bring the content to life.

            ------
            Structure your response using markdown headers as follows:

            Start with a primary header for the slide title (e.g., # [Title]).

            Follow with a secondary header for key points (e.g., ## Key Points).

            Then a tertiary header for the explanation (e.g., ### Explanation).
            Ensure your slides are non-static—each. Each slide does NOT need to have the same format. Slide must be tailored dynamically based on the provided syllabus and must maintain a natural flow, clarity, and engagement. Format the output entirely in valid markdown.'''
        ).get('message', '')
        """
        # Initialize an empty string to accumulate responses
        slides_response = ""

        # Iterate over each course in the syllabus_data
        for course in syllabus_data["course_outline"]:
            # Build a tailored prompt for the current course (each group of subtopics)
            prompt =  f'''You are an expert educational slide designer and content generator. Your task is to create the best, most dynamic, and beautiful markdown slides for an educational course. Each slide should be concise, engaging, and reflect current best practices.
            You must create a series of slides for each subtopic mentioned in the syllabus below.
            Syllabus:
            {course}
            ------
            Each subtopic needs to have thorough content. A series of slides means that: first having an introduction in intuitive words, the gradually going harder and deeper in the content, and it's up to you to determine how many slides to have for this topic.
            While you are going deeper in the content, you may include examples (may be code in computer science, math examples in Math, etc.), detailed explanation on the key points, proofs of correctness, etc..
            Ensure your slides are non-static—each. Each slide does NOT need to have the same format. Slide must be tailored dynamically based on the provided syllabus and must maintain a natural flow, clarity, and engagement. Format the output entirely in valid markdown.
            Structure your response using markdown headers as follows:

            Start with a primary header for the slide title (e.g., # [Title]).

            Follow with a secondary header and then third etc....
            '''
            # Call process_message for the current course and extract the message
            response = chatbot_instance.process_message(prompt).get('message', '')
            
            # Accumulate the response
            slides_response += response + "\n\n"
        
        #slides_response = "# Slide Set for Zhong County’s Cadre System\n\n## Slide 1: Research Context\n\n### Key Points\n- Author’s fieldwork in Zhong County\n- Motivation for exploring local politics\n\n### Explanation\nThe author spent years observing how local leaders operate, driven by the desire to understand their influence on county-level governance.\n\n### Visuals\n- Map of Zhong County\n- Timeline of the author’s fieldwork\n\n### Examples\nHow observing political meetings shaped the study’s focus.\n\n---\n\n## Slide 2: Research Object and Methods\n\n### Key Points\n- Study focuses on leaders since 1978\n- Uses interviews and career analysis\n\n### Explanation\nBy examining career paths and personal stories, the study highlights the unique challenges faced by Zhong County’s leaders.\n\n### Visuals\n- Flowchart of research methods\n- Quotes from interviews\n\n### Examples\nHow a leader’s personal journey reveals systemic issues.\n\n---\n\n## Slide 3: Four-Tiered Pyramid\n\n### Key Points\n- Deputy Section to Division levels\n- Each level’s roles and responsibilities\n\n### Explanation\nThe cadre system is structured like a pyramid, with fewer positions at the top. This hierarchy influences promotion and power dynamics.\n\n### Visuals\n- Pyramid diagram of hierarchy\n- Examples of positions at each level\n\n### Examples\nHow a Deputy Section role differs from a Division one.\n\n---\n\n## Slide 4: Family Background\n\n### Key Points\n- Farmers vs. cadre families\n- Impact on career advancement\n\n### Explanation\nCadres from non-agricultural backgrounds often have more opportunities due to existing connections and resources.\n\n### Visuals\n- Pie chart of family origins\n- Case study of a cadre from a farming family\n\n### Examples\nA farmer’s son who became a county leader through education.\n\n---\n\n## Slide 5: Gender Distribution\n\n### Key Points\n- Male-dominated system\n- Barriers for female cadres\n\n### Explanation\nWomen face societal expectations and biases, limiting their rise to leadership. Efforts to increase representation are ongoing but challenging.\n\n### Visuals\n- Bar graph of gender ratios\n- Stories of successful female cadres\n\n### Examples\nA female leader who overcame rumors to earn respect.\n\n---\n\n## Slide 6: Entry Pathways\n\n### Key Points\n- Three main channels: education, military, recruitment\n- Role of connections and background\n\n### Explanation\nGetting into the cadre system often requires a mix of qualifications and Guanxi. Family ties can open doors that would otherwise stay shut.\n\n### Visuals\n- Venn diagram of entry sources\n- Anecdotes about unconventional entries\n\n### Examples\nA teacher who transitioned to a government role thanks to Guanxi."
        pre_slides = chatbot_instance.parse_slides(slides_response)
        # slides_path = os.path.join(course_dir, "slides.json")
        # with open(slides_path, 'w') as f:
        #     json.dump(pre_slides, f, indent=4)
        # XXXX

        s3_utils.upload_json_to_s3(pre_slides, "jasmintechs-tutorion", s3_utils.get_s3_file_path(username, course_id, "slides.json"))

        print("*Slides response*:", slides_response)
        return pre_slides
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    

'''
#phase one
extract_prompt = f"""
You are a teaching assistant.  
Given this syllabus entry:
{course}
Return a JSON array called “subtopics” listing each subtopic title exactly as written.
"""
subtopics_json = chatbot_instance.process_message(extract_prompt)['message']
subtopics = json.loads(subtopics_json)['subtopics']

analysis_prompt = f"""
You are an expert educator.  
**Subtopic:** {subtopic}  

**Step‑by‑Step Analysis**  
1. List 3–5 learning objectives.  
2. For each objective, explain why it matters.  
3. Suggest one illustrative example (code/math/diagram).

#phase two
Format as JSON:
{{
  "subtopic": "...",
  "analysis": [
    {{
      "objective": "...",
      "importance": "...",
      "example": "..."
    }},
    …
  ]
}}
"""
analysis_json = chatbot_instance.process_message(analysis_prompt)['message']
analysis = json.loads(analysis_json)

#phase three
outline_prompt = f"""
You are an expert slide architect.  
Using this analysis for “{subtopic}”:
{json.dumps(analysis, indent=2)}

Build a **JSON outline** where each item is a slide with:
- title  
- header (e.g. “Introduction”, “Deep Dive”, “Example”)  
- bullet points  

Example:
[
  {{
    "slide_title": "Intro: Why X Matters",
    "section": "Introduction",
    "bullets": ["…", "…"]
  }},
  …
]
"""
outline_json = chatbot_instance.process_message(outline_prompt)['message']
outline = json.loads(outline_json)

#phase four
draft_prompt = f"""
You are an expert educational slide designer.  
Here is your outline for “{subtopic}”:
{json.dumps(outline, indent=2)}

Produce **markdown slides**.  
- Use `#`, `##`, `###` headers per slide.  
- Keep slides concise and engaging.  
- Include code blocks or math where noted.  
Output only valid markdown.
"""
draft_markdown = chatbot_instance.process_message(draft_prompt)['message']

#phase five
polish_prompt = f"""
You are a slide QA expert.  
Here is a first draft of markdown slides for “{subtopic}”:
{draft_markdown}
Please:
1. Vary slide formats (e.g. swap a bullet‑list slide for a 2‑column example slide).  
2. Replace any generic phrases (“In this slide…”) with more dynamic language.  
3. Confirm all headers follow the hierarchy (`# Title`, `## Section`, `### Point`).  

Return only the **polished markdown**.
"""
slides_response = chatbot_instance.process_message(polish_prompt)['message']

pre_slides = chatbot_instance.parse_slides(slides_response)
'''


@customize_bp.route('/customize/get_slides', methods=['POST'])
@cross_origin(supports_credentials=True)
def get_slides():
    try:
        data = request.json
        course_id = data.get('course_title')  # Client must send this
        username = user_utils.get_current_user(request)
        if not username or not course_id:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        #XXXXX
        # Load course-specific context
        # user_folder = user_utils.get_user_folder("../uploads", username)
        # course_dir = os.path.join(user_folder, course_id)
        
        # Load and parse the syllabus JSON file
        # syllabus_path = os.path.join(course_dir, "slides.json")
        # with open(syllabus_path, 'r') as f:
        #     slides_data = json.load(f)
        # print(username, course_id)
        # print(s3_utils.get_s3_file_path(username, course_id, "slides.json"))
        slides_data = s3_utils.get_json_from_s3("jasmintechs-tutorion", s3_utils.get_s3_file_path(username, course_id, "slides.json"))
        # print(slides_data)
        return jsonify(slides_data), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

    
@customize_bp.route('/customize/get_course_structure', methods=['POST'])
@cross_origin(supports_credentials=True)
def get_course_structure():
    try:
        data = request.json
        course_id = data.get('course_title')  # Client must send this
        username = user_utils.get_current_user(request)
        
        if not username or not course_id:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        course_structure = s3_utils.get_json_from_s3("jasmintechs-tutorion", s3_utils.get_s3_file_path(username, course_id, "course_content.json"))

        return jsonify(course_structure), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
        
