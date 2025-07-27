import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Union, Dict, List, Any

import utils.s3_utils as s3_utils
import utils.load_and_process_index as faiss_utils


logger = logging.getLogger(__name__)

class CourseManager:
    def __init__(self, user_email: str, api_key: Optional[str] = None):
        """Initialize CourseManager.
        
        Args:
            user_email: The user's email address.
            api_key: The OpenAI API key. Optional for methods that don't require it.
        """
        if not user_email:
            raise ValueError("User email cannot be empty")
        # API key is now optional, check only if needed by specific methods
        # if not api_key:
        #     raise ValueError("API key cannot be empty")
            
        self.user_email = user_email
        self.api_key = api_key
        self.s3_bucket = s3_utils.S3_BUCKET_NAME # Assuming bucket name is accessible

    def _get_course_folder(self, course_id: str) -> str:
        """Helper to get the S3 path for a course."""
        return f"user_data/{self.user_email}/{course_id}/"
        
    def _get_course_info_key(self, course_id: str) -> str:
        """Helper to get the S3 key for course_info.json."""
        return f"{self._get_course_folder(course_id)}course_info.json"
        
    def _get_current_utc_iso_string(self) -> str:
        """Returns the current UTC time in ISO 8601 format with Z."""
        return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


    def create_or_update_course(
        self, 
        course_title: str, 
        course_id: Optional[str] = None, 
        description: Optional[str] = None,
        ai_voice: str = 'jennifer', #TODO: This will connect to VAPI later
        uploaded_files_metadata: List[Dict[str, Any]] = [], # List of {'name': str, 'size': int}
        creation_step: int = 1,
        is_creation_complete: bool = False,
        is_published: bool = False
    ) -> Dict:
        """
        Creates a new course info file or updates an existing one based on the new structure.
        
        Args:
            course_title: Title of the course.
            course_id: Optional ID for updating an existing course.
            description: Optional course description.
            ai_voice: Name of the AI voice to use.
            uploaded_files_metadata: Initial list of uploaded file metadata.
            creation_step: The current step in the course creation process (1-5).
            is_creation_complete: Flag indicating if the entire creation process is done.

        Returns:
            The created or updated course info dictionary.
        """
        is_new_course = not course_id
        if is_new_course:
            course_id = str(uuid.uuid4())
            logger.info(f"[{self.user_email}] Creating new course: ID={course_id}, Title='{course_title}'")
        else:
            logger.info(f"[{self.user_email}] Updating course: ID={course_id}, Title='{course_title}'")
            
        course_folder = self._get_course_folder(course_id)
        course_info_key = self._get_course_info_key(course_id)

        # 1. Ensure user folder exists (assuming check_and_create handles this)
        s3_utils.check_and_create_user_folder(self.user_email)
        
        # 2. Fetch existing course info or initialize new structure
        if not is_new_course:
            try:
                course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
                if not course_info: # Handle case where ID exists but file doesn't
                     raise FileNotFoundError("Course info not found for existing ID")
                logger.info(f"Fetched existing course info for {course_id}")
            except Exception as e:
                logger.error(f"Error fetching existing course info for {course_id}: {e}")
                raise ValueError(f"Failed to retrieve existing course info for update: {course_id}") from e
        else:
            course_info = {
                "id": course_id,
                "created_at": self._get_current_utc_iso_string(),
                "title": "",
                "description": None, 
                "author": self.user_email,
                "create_course_process": {
                    "is_creation_complete": False,
                    "current_step": 1
                },
                "uploadedFiles": [],
                "progress": {
                    "hours": 0,
                    "completion": 0.0 
                },
                "ai_voice": "jennifer",
                "is_published": False,
                "last_updated_at": self._get_current_utc_iso_string() 
            }
            
        # 3. Update fields based on input
        course_info["title"] = course_title
        if description is not None: # Allow setting description to empty string or nulling it
            course_info["description"] = description
        course_info["ai_voice"] = ai_voice
        
        # Update creation process status
        course_info["create_course_process"]["current_step"] = creation_step
        course_info["create_course_process"]["is_creation_complete"] = is_creation_complete
        
        # Overwrite or initialize uploaded files metadata list IF PROVIDED.
        # If not provided during an update, keep the existing list.
        # Note: Individual file adds/removes should use add/remove methods.
        if uploaded_files_metadata: 
             course_info["uploadedFiles"] = uploaded_files_metadata
        elif is_new_course: # Ensure it's an empty list for new courses if not provided
             course_info["uploadedFiles"] = []

        # Update timestamp
        course_info["last_updated_at"] = self._get_current_utc_iso_string()
        
        # 4. Save course_info.json back to S3
        try:
            s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
            logger.info(f"Uploaded course info to {course_info_key}")
        except Exception as e:
            logger.error(f"Failed to upload course info for {course_id}: {e}")
            raise # Re-raise the exception
            
        # 5. IMPORTANT: Removed FAISS processing and adding to user list from here.
        # This should be triggered separately, when is_creation_complete becomes true.
        
        return course_info

    def add_uploaded_file(self, course_id: str, filename: str, filesize: int) -> bool:
        """
        Adds metadata of a newly uploaded file to the course_info.json.
        Assumes the file has already been uploaded to S3 successfully.

        Args:
            course_id: The ID of the course.
            filename: The name of the uploaded file.
            filesize: The size of the uploaded file in bytes.

        Returns:
            True if the update was successful, False otherwise.
        """
        logger.info(f"[{self.user_email}] Adding file '{filename}' ({filesize} bytes) to course {course_id}")
        course_info_key = self._get_course_info_key(course_id)
        
        try:
            # Fetch the current course info
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                logger.error(f"Cannot add file: Course info not found for {course_id}")
                return False

            # Initialize uploadedFiles if it doesn't exist
            if "uploadedFiles" not in course_info:
                course_info["uploadedFiles"] = []
                
            # Check if file already exists in the list (by name)
            file_exists = any(f.get("name") == filename for f in course_info["uploadedFiles"])
            
            if not file_exists:
                # Add new file metadata
                course_info["uploadedFiles"].append({
                    "name": filename,
                    "size": filesize
                })
                course_info["last_updated_at"] = self._get_current_utc_iso_string()

                # Save updated course info
                s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
                logger.info(f"Successfully added file '{filename}' metadata to {course_info_key}")
                return True
            else:
                logger.warning(f"File '{filename}' already exists in metadata for course {course_id}. Skipping add.")
                # Return True as the state is effectively consistent (file is listed)
                return True 

        except Exception as e:
            logger.error(f"Error adding file metadata for course {course_id}, file {filename}: {e}")
            return False
            
    def remove_uploaded_file(self, course_id: str, filename: str) -> bool:
        """
        Removes metadata of a deleted file from the course_info.json.
        Assumes the file has already been deleted from S3 successfully.

        Args:
            course_id: The ID of the course.
            filename: The name of the file to remove metadata for.

        Returns:
            True if the update was successful, False otherwise.
        """
        logger.info(f"[{self.user_email}] Removing file '{filename}' from course {course_id}")
        course_info_key = self._get_course_info_key(course_id)
        
        try:
            # Fetch the current course info
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                logger.error(f"Cannot remove file: Course info not found for {course_id}")
                return False

            # Find and remove the file metadata
            initial_length = len(course_info.get("uploadedFiles", []))
            course_info["uploadedFiles"] = [
                f for f in course_info.get("uploadedFiles", []) if f.get("name") != filename
            ]
            
            # Check if anything was actually removed
            if len(course_info["uploadedFiles"]) < initial_length:
                logger.info(f"Removed file '{filename}' metadata from course {course_id}.")
                course_info["last_updated_at"] = self._get_current_utc_iso_string()
                
                # Save updated course info
                s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
                logger.info(f"Successfully updated {course_info_key} after removing file.")
                return True
            else:
                logger.warning(f"File '{filename}' not found in metadata for course {course_id}. No update needed.")
                return True # Return True as state is consistent (file is not listed)

        except Exception as e:
            logger.error(f"Error removing file metadata for course {course_id}, file {filename}: {e}")
            return False


    def get_course_info(self, course_id: str) -> Optional[Dict]:
        """Fetches the course_info.json for a given course_id."""
        course_folder = self._get_course_folder(course_id)
        course_info_key = f"{course_folder}course_info.json"
        try:
            return s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
        except Exception as e:
            logger.error(f"Failed to get course info for {course_id}: {e}")
            return None

    def get_all_courses(self) -> Dict:
        """
        Fetches all courses (identified by folders) for the user and categorizes them.
        Courses with 'is_creation_complete' = true are 'completed'.
        Courses with 'is_creation_complete' = false are 'drafts'.
        """
        logger.info(f"Fetching all courses for user {self.user_email}")
        completed_courses = []
        draft_courses = []
        
        try:
            course_ids = s3_utils.list_user_course_ids(self.user_email)
            
            for course_id in course_ids:
                info = self.get_course_info(course_id)
                if info:
                    # Check the nested flag for completion status
                    is_complete = info.get('create_course_process', {}).get('is_creation_complete', False)
                    if is_complete:
                        # Optionally add/transform fields for the API response if needed
                        # Example: Add author if missing (though it should be set on creation)
                        info['author'] = info.get('author', self.user_email) 
                        completed_courses.append(info)
                    else:
                        # Optionally add/transform fields for drafts
                        info['author'] = info.get('author', self.user_email)
                        draft_courses.append(info)
                else:
                    logger.warning(f"Could not retrieve course info for listed course ID: {course_id}")
                        

            completed_courses.sort(key=lambda x: x.get('last_updated_at', ''), reverse=True)
            draft_courses.sort(key=lambda x: x.get('last_updated_at', ''), reverse=True)
            
            return {'courses': completed_courses, 'drafts': draft_courses}

        except Exception as e:
            logger.error(f"Error fetching all courses for {self.user_email}: {e}")
            return {'courses': [], 'drafts': []}

    def process_course_content(self, course_id: str) -> bool:
        """Explicitly triggers FAISS processing for a course."""
        logger.info(f"Manually triggering content processing for course {course_id}")
        
        # Check for API key only when needed
        if not self.api_key:
            logger.error(f"API key missing for processing course {course_id}")
            raise ValueError("API key is required for processing course content")
            
        try:
            success = faiss_utils.process_course_context_s3(
                self.s3_bucket,
                self.user_email,
                course_id,
                self.api_key
            )
            if success:
                 logger.info(f"Successfully processed context for course {course_id}")
            else:
                 logger.error(f"Failed to process context for course {course_id}")
            return success
        except Exception as e:
            logger.error(f"Error processing context for course {course_id}: {e}")
            return False


    def customize_course(self, course_id: str, title: str, progress: int, ai_tutor: dict, uploaded_files: list) -> bool:
        """Handles course customization and configuration updates."""
        # TODO: Implement logic similar to the original /customize endpoint
        # - Update course_info.json
        # - Generate and save course_config.json (system prompt)
        # - Reprocess context? (Consider if necessary after customization)
        return False

    def generate_syllabus(self, course_id: str) -> Optional[Dict]:
        """Generates and saves the course syllabus."""
        logger.info(f"Generating syllabus for course {course_id}")
        
        # Check if course info exists first
        try:
            course_info = self.get_course_info(course_id)
            if not course_info:
                logger.error(f"Cannot generate syllabus: Course info not found for {course_id}")
                return None
                
            # Mock data for now - TODO: Replace with actual syllabus generation
            mock_data = {
                "course_outline": [
                    {
                    "title": "Introduction",
                    "description": "Overview of the research on Zhong County's cadre system.",
                    "subtopics": [
                        {
                        "title": "Research Context",
                        "description": "Background of the research, including the author's fieldwork experience in Zhong County and the motivation behind the study."
                        },
                        {
                        "title": "Research Object and Methods",
                        "description": "Details about the research subjects (Zhong County leaders since 1978) and the methodologies employed (political elite career analysis, in-depth interviews, literature analysis, and participant observation)."
                        },
                        {
                        "title": "Literature Review",
                        "description": "Summary of existing research on Chinese political elites, including their characteristics, promotion patterns, the influence of institutions and positions, the role of performance and connections, and studies on county and township level elites."
                        },
                        {
                        "title": "Research Questions and Significance",
                        "description": "Central research questions about Zhong County's cadre system and the broader implications of the study for understanding Chinese local politics and elite dynamics."
                        }
                    ]
                    },
                    {
                    "title": "Composition of Zhong County's Cadre",
                    "description": "Analysis of the hierarchical structure and demographic characteristics of Zhong County's cadre system.",
                    "subtopics": [
                        {
                        "title": "Four-Tiered Pyramid",
                        "description": "Description of the four-level hierarchy of the cadre system: Deputy Section, Section, Deputy Division, and Division, with examples of positions at each level."
                        },
                        {
                        "title": "Family Background",
                        "description": "Analysis of the cadres' family origins, categorized as agricultural (farmers) and non-agricultural (cadres, workers, business owners), with statistical breakdown and discussion of the significance of family background in career advancement."
                        },
                        {
                        "title": "Gender",
                        "description": "Examination of the gender distribution within the cadre system, highlighting the underrepresentation of women, especially in leadership positions, and discussing the challenges faced by female cadres, including societal expectations, implicit bias, and rumors."
                        },
                        {
                        "title": "Age",
                        "description": "Analysis of the age structure of the cadre system, including age ranges, average age, and the concept of \"stage aging.\" Discussion of age norms, promotion patterns, and the impact of age on career trajectories."
                        },
                        {
                        "title": "Education",
                        "description": "Examination of the educational background of cadres, including their first degrees (full-time education) and on-the-job degrees, with a focus on the prevalence of \"secondary school generation\" and the increasing emphasis on on-the-job education. Analysis of the shift from specialization to a more generalist approach."
                        },
                        {
                        "title": "Native Place",
                        "description": "Analysis of the geographical distribution of cadres' native places, highlighting the dominance of local elites and the phenomenon of \"elite clusters.\" Discussion of the impact of birthplace, regionalism, and career mobility."
                        }
                    ]
                    },
                    {
                    "title": "Entry into the Cadre System",
                    "description": "Examination of the pathways and mechanisms for entering the cadre system in Zhong County.",
                    "subtopics": [
                        {
                        "title": "Three Sources",
                        "description": "Description of the three main channels for entering the cadre system: assignment of college and secondary school graduates, transfer of military cadres, and recruitment through various methods. Discussion of the role of education, military experience, and social connections in accessing these channels."
                        },
                        {
                        "title": "Initial Job Acquisition",
                        "description": "Analysis of how cadres obtained their first jobs, including the principle of matching majors with positions, the role of social resources (Guanxi), and the impact of family background."
                        },
                        {
                        "title": "Inter-unit Mobility",
                        "description": "Examination of cadre transfers between different units and institutions, including factors influencing mobility, such as institutional needs, personal aspirations, and social connections. Discussion of the concept of \"unit society\" and the significance of unit mobility in career advancement."
                        }
                    ]
                    }
                ]
            }
            
            # Save the syllabus to S3 (similar to how slides are saved)
            try:
                syllabus_key = f"{self._get_course_folder(course_id)}/syllabus.json"
                s3_utils.upload_json_to_s3(
                    self.s3_bucket,
                    syllabus_key,
                    mock_data
                )
                logger.info(f"Successfully saved syllabus.json for course {course_id}")
                
                # Return the syllabus data for the API response
                return mock_data
                
            except Exception as e:
                logger.error(f"Failed to save syllabus.json for course {course_id}: {e}")
                return None
                
        except Exception as e:
            logger.error(f"Error generating syllabus for course {course_id}: {e}")
            return None

    def generate_slides(self, course_id: str) -> bool:
        """Generates and saves course slides."""
        logger.info(f"Generating slides for course {course_id}")
        
        # Check if course info exists first
        try:
            course_info = self.get_course_info(course_id)
            if not course_info:
                logger.error(f"Cannot generate slides: Course info not found for {course_id}")
                return False
                
            # for now, this is mock data i get from bob's folder
            # TODO: Robert will implement this endpoint in more detail
            mock_data_slides = [
            {
                "id": 1,
                "local_id": 1,
                "title": f"Welcome to {course_info.get('title', 'Course')}!",
                "slide_markdown": f"**{course_info.get('title', 'Course')}**\n\n*   Course overview\n*   Key concepts\n*   Learning objectives\n*   Course structure",
                "transcript": f"Welcome to {course_info.get('title', 'this course')}. In this first lecture, we'll briefly go over the course structure, introduce the core concepts, look at the learning objectives, and give you an overview of what to expect.",
                "preview": "/images/section_1/slide_1_1.png",
                "preview_path": "",
                "subtopic_id": 0,
                "subtopic_title": "Introduction",
                "section_id": 1,
                "section_title": "Lecture 1: Introduction",
                "prev_slide": None,
                "next_slide": 2,
                "position": 0
            },
            {
                "id": 2,
                "local_id": 35,
                "title": "Lecture 1: Summary",
                "slide_markdown": "*   **Overview:** Course structure and organization.\n*   **Key Concepts:** Introduction to fundamental ideas.\n*   **Learning Objectives:** What you'll learn in this course.\n*   **Next Steps:** What to expect in the upcoming lectures.",
                "transcript": "Let's quickly review what we covered in this first lecture. We discussed the course structure and organization, introduced some fundamental concepts, outlined the learning objectives for the course, and previewed what's coming in the next lectures.",
                "preview": "/images/section_1/slide_1_35.png",
                "preview_path": "",
                "subtopic_id": 0,
                "subtopic_title": "Introduction",
                "section_id": 1,
                "section_title": "Lecture 1: Introduction",
                "prev_slide": 1,
                "next_slide": 3,
                "position": 1
            }]
            
            try:
                # Save the slides to S3
                slides_key = f"{self._get_course_folder(course_id)}slides.json"
                s3_utils.upload_json_to_s3(mock_data_slides, self.s3_bucket, slides_key)
                logger.info(f"Successfully saved slides for course {course_id}")
                return True
            except Exception as e:
                logger.error(f"Error saving slides for course {course_id}: {e}")
                return False
                
        except Exception as e:
            logger.error(f"Error generating slides for course {course_id}: {e}")
            return False

    def get_course_outline(self, course_id: str) -> Optional[List[Dict[str, Any]]]:
        """Fetches the generated course outline (syllabus.json) for a course."""
        logger.info(f"Fetching course outline for course {course_id}")
        syllabus_key = f"{self._get_course_folder(course_id)}syllabus.json"
        try:
            syllabus_data = s3_utils.get_json_from_s3(self.s3_bucket, syllabus_key)
            if syllabus_data and isinstance(syllabus_data.get("course_outline"), list):
                logger.info(f"Successfully fetched course outline from {syllabus_key}")
                return syllabus_data.get("course_outline")
            else:
                logger.warning(f"Course outline not found or is invalid in {syllabus_key}")
                return None
        except Exception as e:
            logger.error(f"Error fetching course outline from {syllabus_key}: {e}")
            return None
        
    def get_slides(self, course_id: str) -> Optional[List[Dict[str, Any]]]:
        """Fetches generated slides for a course."""
        logger.info(f"Fetching slides for course {course_id}")
        slides_key = f"{self._get_course_folder(course_id)}slides.json"
        try:
            slides_data = s3_utils.get_json_from_s3(self.s3_bucket, slides_key)
            if slides_data and isinstance(slides_data, list): # Assuming slides.json directly contains the list
                logger.info(f"Successfully fetched slides from {slides_key}")
                return slides_data
            elif slides_data: # If it's a dict with a key, adjust as needed
                logger.warning(f"Slides data in {slides_key} is not a direct list. Check structure.")
                return None # Or handle extraction if slides_data is {'slides': [...]}
            else:
                logger.warning(f"Slides not found or are invalid in {slides_key}")
                return None
        except Exception as e:
            logger.error(f"Error fetching slides from {slides_key}: {e}")
            return None

    def delete_course(self, course_id: str) -> bool:
        """Deletes a course folder and removes it from the user's list."""
        logger.info(f"Deleting course {course_id} for user {self.user_email}")
        try:
            course_folder = self._get_course_folder(course_id)
            # 1. Delete the folder from S3
            s3_utils.delete_folder_from_s3(self.s3_bucket, course_folder)
            
            logger.info(f"Successfully deleted course folder {course_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting course {course_id}: {e}")
            return False