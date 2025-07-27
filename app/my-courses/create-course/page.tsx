"use client"

// React imports
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

// Auth import
import { useAuth } from "@/auth/firebase"

// UI Components
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HeaderWithLogo } from "@/components/layout/HeaderWithLogo"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Icons
import { Trash2, Loader2, AlertCircle, ArrowLeft } from "lucide-react"

// Course creation components
import { StepNavigation, steps } from "@/components/my-courses/create-course/StepNavigation"
import { TitleStep } from "@/components/my-courses/create-course/TitleStep"
import { DescriptionStep } from "@/components/my-courses/create-course/DescriptionStep"
import { UploadStep } from "@/components/my-courses/create-course/UploadStep"
import { ReviewSyllabusStep } from "@/components/my-courses/create-course/ReviewSyllabusStep"
import { SelectVoiceStep } from "@/components/my-courses/create-course/SelectVoiceStep"
import { ConfirmStep } from "@/components/my-courses/create-course/ConfirmStep"
import { NavigationButtons } from "@/components/my-courses/create-course/NavigationButtons"

// Types
import { Section } from "@/components/my-courses/create-course/SyllabusTypes"
import { CourseInfo } from "@/components/my-courses/utils/courseTypes"

// API functions 
import {
  createOrUpdateCourseMetadata,
  uploadCourseFile,
  deleteCourseFile,
  validateFile,
  formatFileSize,
  deleteCourse,
  processCourseContent,
  generateCourseSyllabus,
  retrieveCourseSyllabus,
  fetchCourseById,
  autoSaveCourseContent,
  updateCourseStep,
  fetchCourseSyllabusFromS3,
} from "@/components/my-courses/utils/course-api-endpoints"


export default function CreateCoursePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State for course creation
  const [currentStep, setCurrentStep] = useState("title");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [aiVoice, setAiVoice] = useState("female1"); // Default voice
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState<{ name: string; size: number }[]>([]);
  const [pendingFileOperations, setPendingFileOperations] = useState<Set<string>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);
  const [isGeneratingSyllabus, setIsGeneratingSyllabus] = useState(false);
  const [syllabus, setSyllabus] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Add state for discard dialog
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  // Add state for back navigation dialog
  const [isBackDialogOpen, setIsBackDialogOpen] = useState(false);
  // Add state for loading draft
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  // Add state for auto-save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [syllabusFetchMethod, setSyllabusFetchMethod] = useState<'generate' | 'retrieve'>('generate');

  // State to manage if an explicit course creation via "Next" on title step is in progress
  const [isExplicitlyCreatingCourse, setIsExplicitlyCreatingCourse] = useState(false);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clearAutoSaveTimer = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };

  // Auto-save indicator timeout
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000); // Reset after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Add useEffect to load draft course if courseId is in the URL
  useEffect(() => {
    const loadDraftCourse = async () => {
      if (!user || authLoading) return;

      // Get courseId from URL query parameters
      const params = new URLSearchParams(window.location.search);
      const draftCourseId = params.get('courseId');

      if (!draftCourseId) return; // No draft to load

      setIsLoadingDraft(true);
      try {
        const idToken = await user.getIdToken();
        const draftCourse = await fetchCourseById(idToken, draftCourseId);

        if (draftCourse) {
          // Update all relevant state with the loaded draft data
          setCourseId(draftCourse.id);
          setCourseTitle(draftCourse.title || "");
          setCourseDescription(draftCourse.description || "");
          setUploadedFilesInfo(draftCourse.uploadedFiles || []);
          setAiVoice(draftCourse.ai_voice || "female1");

          // Get and validate the saved step
          const savedStep = draftCourse.create_course_process?.current_step || 1;

          // Ensure the step is valid and within range
          if (savedStep > 0 && savedStep <= steps.length) {
            const savedStepId = steps[savedStep - 1].id;
            console.log(`Loaded draft course: ${draftCourse.title} at step ${savedStepId} (step ${savedStep})`);

            // If we're at the review step (step 4), we need to load the syllabus
            if (savedStep === 4) {
              console.log("Loading syllabus for review step...");
              try {
                // Use retrieveCourseSyllabus instead of trying to generate
                const syllabusResult = await retrieveCourseSyllabus(idToken, draftCourse.id);
                console.log("Loaded syllabus:", syllabusResult);

                // Extract the course_outline array from the response
                if (syllabusResult && syllabusResult.course_outline && Array.isArray(syllabusResult.course_outline)) {
                  setSyllabus(syllabusResult.course_outline);
                  setCurrentStep("review"); // Set the step after syllabus is loaded
                  setSyllabusFetchMethod('retrieve'); // Mark that we retrieved existing syllabus
                } else {
                  console.error("Invalid syllabus format received", syllabusResult);
                  // If syllabus failed to load, set to upload step instead
                  setCurrentStep("upload");
                  setFileError("Failed to load course syllabus. Please try generating it again.");
                }
              } catch (syllabusError) {
                console.error("Error loading syllabus:", syllabusError);
                // If syllabus failed to load, set to upload step instead
                setCurrentStep("upload");
                setFileError("Failed to load course syllabus. Please try generating it again.");
              }
            } else {
              // For non-syllabus steps, just set the step directly
              setCurrentStep(savedStepId);
            }
          } else {
            console.warn(`Invalid step number ${savedStep}, defaulting to title step`);
            setCurrentStep("title");
          }
        }
      } catch (error) {
        console.error("Error loading draft course:", error);
        alert("Failed to load draft course. Please try again.");
      } finally {
        setIsLoadingDraft(false);
      }
    };

    if (user && !authLoading) {
      loadDraftCourse();
    }
  }, [user, authLoading]);

  // --- Auto-save content --- 

  // Function to auto-save content changes without updating step
  const autoSaveContent = useCallback(async (
    contentData: {
      title: string;
      description?: string;
      ai_voice?: string;
    },
    isExplicitAttempt = false
  ) => {
    if (!user || !contentData.title.trim()) return null;

    if (!courseId && currentStep !== 'title') {
      console.warn("autoSaveContent: Attempted to save content without courseId on a non-title step. Aborting.", currentStep);
      return null;
    }

    // Prevent duplicate creation if an explicit creation is underway by handleNextClick
    // and this call is a background auto-save for the title step.
    if (!courseId && currentStep === 'title') { // Potential creation scenario
      if (!isExplicitAttempt && isExplicitlyCreatingCourse) {
        console.log("autoSaveContent: Explicit creation by Next button is in progress. This background save will not attempt to create a new course.");
        return null; // Background save yields to explicit save
      }
    }

    setSaveStatus('saving');
    try {
      const idToken = await user.getIdToken();

      const saveData: Partial<CourseInfo> & { course_title: string } = {
        course_title: contentData.title.trim(),
      };

      if (contentData.description !== undefined) {
        saveData.description = contentData.description.trim();
      }

      if (contentData.ai_voice !== undefined) {
        saveData.ai_voice = contentData.ai_voice;
      }

      if (courseId) {
        saveData.id = courseId;
      }

      const savedCourse = await autoSaveCourseContent(idToken, saveData);

      // Only update courseId if this is first save
      if (!courseId && savedCourse?.id) {
        setCourseId(savedCourse.id);
        console.log("New course created with ID:", savedCourse.id);
      }

      // Update save status
      setSaveStatus('saved');
      setLastSavedTime(new Date());

      return savedCourse;
    } catch (error) {
      console.error("Error auto-saving content:", error);
      setSaveStatus('idle');

      // Don't show alert for normal auto-saves, only when user triggered directly
      if (autoSaveTimerRef.current === null) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showErrorNotification(`Failed to save course content: ${errorMessage}`);
      }

      return null;
    }
  }, [user, courseId, currentStep, isExplicitlyCreatingCourse]);

  // Function to update course step during navigation
  const updateStep = useCallback(async (courseIdForOperation: string, stepNumber: number, isComplete: boolean = false) => {
    if (!user || !courseIdForOperation) return null;

    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();

      const updatedCourse = await updateCourseStep(idToken, courseIdForOperation, stepNumber, isComplete);
      console.log(`Updated to step ${stepNumber} (course: ${courseIdForOperation}), complete: ${isComplete}`);

      return updatedCourse;
    } catch (error) {
      console.error("Error updating step:", error);
      alert(`Failed to update step: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  // Add auto-save after user input changes with debounce
  useEffect(() => {
    // Skip if no title or on first load
    if (!courseTitle.trim() || !user) return;

    // Skip if we're loading a draft
    if (isLoadingDraft) return;

    // If an explicit creation via Next button on title step is happening, useEffect auto-save should wait.
    if (isExplicitlyCreatingCourse) {
      clearAutoSaveTimer(); // Ensure any previously set timer is cleared
      return;
    }

    // Skip if we're already saving (general save lock)
    if (saveStatus === 'saving') return;

    // Clear any existing timeout
    clearAutoSaveTimer();

    // Set a new timeout for auto-save (debounce)
    autoSaveTimerRef.current = setTimeout(async () => {
      // Prepare data for auto-save
      const contentData = {
        title: courseTitle,
        ...(currentStep !== 'title' ? { description: courseDescription } : {}),
        ...(currentStep === 'voice' ? { ai_voice: aiVoice } : {})
      };

      // Execute auto-save
      await autoSaveContent(contentData);
    }, 1500); // Auto-save after 1.5 seconds of inactivity

    // Cleanup
    return () => clearAutoSaveTimer();
  }, [
    courseTitle,
    courseDescription,
    aiVoice,
    autoSaveContent,
    user,
    isLoadingDraft,
    saveStatus,
    currentStep,
    completedSteps,
    lastSavedTime,
    isExplicitlyCreatingCourse
  ]);

  // --- Refactored Course Creation/Update Logic ---

  // Function to save metadata (create or update) - kept for backward compatibility and complex operations
  const saveMetadata = useCallback(async (dataToSave: Partial<CourseInfo> & { course_title: string }) => {
    if (!user) return null;
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const idToken = await user.getIdToken();
      const currentCourseId = courseId;

      // Construct the data ensuring correct typing for partial nested objects
      const saveData: Partial<CourseInfo> & { course_title: string } = {
        ...dataToSave, // Spread the partial data
        course_title: dataToSave.course_title // Ensure required title is present
      };
      // If updating, ensure ID is part of the spread or added explicitly
      if (currentCourseId && !saveData.id) {
        saveData.id = currentCourseId;
      }

      const savedCourse = await createOrUpdateCourseMetadata(idToken, saveData);

      if (!currentCourseId && savedCourse.id) {
        setCourseId(savedCourse.id); // Store the new course ID
      }

      // Don't update local state from saved data to prevent overwriting current user input
      // Only update if fields are definitely changed on the server and not in the process of editing
      if (savedCourse.title !== courseTitle && !dataToSave.course_title) {
        setCourseTitle(savedCourse.title);
      }

      if (savedCourse.description !== courseDescription && dataToSave.description === undefined) {
        setCourseDescription(savedCourse.description || "");
      }

      // Always update uploaded files list as this wouldn't be in the middle of editing
      if (JSON.stringify(savedCourse.uploadedFiles) !== JSON.stringify(uploadedFilesInfo)) {
        setUploadedFilesInfo(savedCourse.uploadedFiles || []);
      }

      console.log("Course metadata saved:", savedCourse);

      // Update save status
      setSaveStatus('saved');
      setLastSavedTime(new Date());

      return savedCourse;
    } catch (error) {
      console.error("Error saving course metadata:", error);
      // Don't show alert for auto-saves, only for explicit user actions
      if (!autoSaveTimerRef.current) {
        alert(`Failed to save course data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setSaveStatus('idle');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, courseId, courseTitle, courseDescription, uploadedFilesInfo]);

  // --- Refactored File Handling ---

  const handleFileUpload = async (files: File[]) => {
    if (!user || !courseId) {
      alert("Cannot upload file: Course not initialized yet.");
      return;
    }

    setFileError(null);
    const idToken = await user.getIdToken();

    for (const file of files) {
      if (!validateFile(file)) {
        setFileError(`Invalid file type: ${file.name}. Only .pdf files are supported.`);
        continue; // Skip this file
      }

      // Add to pending operations
      setPendingFileOperations(prev => new Set(prev).add(file.name));

      try {
        console.log(`Uploading file: ${file.name} for course ${courseId}`);
        await uploadCourseFile(idToken, courseId, file);
        console.log(`File uploaded successfully: ${file.name}`);

        // Refresh course data to get updated file list from backend metadata
        if (courseId) {
          // Simple metadata update - since we're on upload step, just update files
          // Need to include create_course_process to preserve current step
          const stepIndex = steps.findIndex(step => step.id === currentStep);
          const stepNumber = stepIndex + 1; // Convert to 1-based index

          await saveMetadata({
            course_title: courseTitle,
            id: courseId,
            create_course_process: {
              current_step: stepNumber,
              is_creation_complete: false
            }
          });
        } else {
          console.error("Cannot refresh course data after upload - courseId is missing");
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        setFileError(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        // Remove from pending operations
        setPendingFileOperations(prev => {
          const next = new Set(prev);
          next.delete(file.name);
          return next;
        });
      }
    }
  };

  const handleFileDelete = async (filename: string) => {
    if (!user || !courseId) return;

    // Add to pending operations
    setPendingFileOperations(prev => new Set(prev).add(filename));

    try {
      const idToken = await user.getIdToken();
      console.log(`Deleting file: ${filename} for course ${courseId}`);
      await deleteCourseFile(idToken, courseId, filename);
      console.log(`File deleted successfully: ${filename}`);

      // Refresh course data from backend
      if (courseId) {
        // Simple metadata update to refresh file list
        const stepIndex = steps.findIndex(step => step.id === currentStep);
        const stepNumber = stepIndex + 1; // Convert to 1-based index

        await saveMetadata({
          course_title: courseTitle,
          id: courseId,
          create_course_process: {
            current_step: stepNumber,
            is_creation_complete: false
          }
        });
      } else {
        console.error("Cannot refresh course data after delete - courseId is missing");
      }
    } catch (error) {
      console.error(`Error deleting file ${filename}:`, error);
      alert(`Failed to delete ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Remove from pending operations
      setPendingFileOperations(prev => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
    }
  };

  // --- Step Navigation Logic (Updated to use updateStep) ---

  const isStepCompleted = (stepId: string) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const stepIndex = steps.findIndex(step => step.id === stepId);
    return stepIndex < currentIndex;
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case "title":
        return courseTitle.trim().length > 0;
      case "description":
        return true; // Description is optional, assume courseId exists if here
      case "upload":
        // Proceed if at least one file is successfully uploaded
        return uploadedFilesInfo.length > 0;
      case "review": // Keep mock logic for now
        return true;
      case "voice":
        return Boolean(aiVoice) && aiVoice.trim().length > 0; // Ensure voice is selected
      default:
        return false;
    }
  };

  const goToNextStep = async (idOverride?: string) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1].id;
      let effectiveCourseId = idOverride || courseId;
      let currentCourseIdForLogic = effectiveCourseId;
      let proceed = true;

      // Save content from specific steps before navigating and calling updateStep
      // This is not the debounced auto-save from useEffect, but an explicit save on navigation.
      const needsExplicitContentSaveBeforeUpdateStep =
        (currentStep === 'title' && !idOverride) || // title (if not initial creation which is handled by handleNextClick)
        currentStep === 'description' ||
        currentStep === 'voice';

      if (needsExplicitContentSaveBeforeUpdateStep) {
        console.log(`[goToNextStep] Explicitly saving content for step: ${currentStep}...`);
        try {
          const contentData = {
            title: courseTitle,
            ...(currentStep === 'description' && { description: courseDescription }),
            ...(currentStep === 'voice' && { ai_voice: aiVoice }),
          };

          // This autoSaveContent call uses courseId from state if effectiveCourseId is null (e.g. not initial creation)
          // and is responsible for ensuring current content is persisted.
          const savedCourse = await autoSaveContent(contentData);

          if (savedCourse?.id) {
            if (!currentCourseIdForLogic) currentCourseIdForLogic = savedCourse.id;
            if (!courseId && savedCourse.id) setCourseId(savedCourse.id); // Update global courseId if it was set here
            console.log(`[goToNextStep] Content saved successfully for step: ${currentStep}. Course ID: ${currentCourseIdForLogic}`);
          } else {
            // If autoSaveContent failed (e.g., returned null)
            proceed = false;
            showErrorNotification(`Failed to save current ${currentStep} content. Cannot proceed.`);
          }
        } catch (error) {
          proceed = false;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showErrorNotification(`Error saving ${currentStep} content: ${errorMessage}`);
        }
      }

      if (proceed && !currentCourseIdForLogic) {
        // This can happen if not initial creation, no idOverride, and courseId state is still null
        // and the content save above didn't yield an ID (e.g. title step without prior ID and save failed)
        console.error("[goToNextStep] Course ID is missing before trying to update step.");
        proceed = false;
        showErrorNotification("Cannot proceed: Course has not been initialized correctly.");
      }

      if (proceed && currentCourseIdForLogic) {
        try {
          const nextStepNumber = currentIndex + 2;
          console.log(`[goToNextStep] Updating backend to step ${nextStepNumber} for course ${currentCourseIdForLogic}...`);
          const updatedCourse = await updateStep(currentCourseIdForLogic, nextStepNumber, false);
          if (!updatedCourse) {
            proceed = false;
            showErrorNotification("Failed to update step progress. Please try again.");
          }
        } catch (error) {
          proceed = false;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showErrorNotification(`Error updating step progress: ${errorMessage}`);
        }
      }

      if (proceed) {
        setCurrentStep(nextStepId);
        window.scrollTo(0, 0);
        console.log(`[goToNextStep] Navigation successful to step: ${nextStepId}`);
      } else {
        console.log("[goToNextStep] Navigation aborted due to previous errors.");
      }
    }
  };

  // Helper function to show error notifications
  const showErrorNotification = (message: string) => {
    // Remove any existing notifications
    document.getElementById('error-notification')?.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div id="error-notification" class="fixed top-4 right-4 max-w-md bg-white border-l-4 border-red-500 shadow-lg rounded-md p-4 z-50 animate-slide-in">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-gray-800 font-medium">${message}</p>
          </div>
          <div class="ml-auto pl-3">
            <div class="-mx-1.5 -my-1.5">
              <button onclick="this.closest('#error-notification').remove()" class="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
                <span class="sr-only">Dismiss</span>
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(notification.firstElementChild!);

    // Add animation styles if not already added
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      const notification = document.getElementById('error-notification');
      if (notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  };

  const goToPreviousStep = async () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const prevStepId = steps[currentIndex - 1].id;
      const prevStepNumber = currentIndex; // Previous step number (1-based)

      // Auto-save any content changes first
      if (currentStep === 'title' || currentStep === 'description' || currentStep === 'voice') {
        const contentData = {
          title: courseTitle,
          ...(currentStep === 'description' ? { description: courseDescription } : {}),
          ...(currentStep === 'voice' ? { ai_voice: aiVoice } : {})
        };

        await autoSaveContent(contentData); // Relies on courseId state
      }

      // Update creation_step in backend when moving backward, if course exists
      if (courseId) { // courseId from state is fine here, as it must exist to go previous
        console.log(`Updating to previous step ${prevStepNumber} for course ${courseId}...`);
        await updateStep(courseId, prevStepNumber, false); // Pass courseId from state
      }

      setCurrentStep(prevStepId);
      window.scrollTo(0, 0);
    }
  };

  // --- Refactored Syllabus Generation ---

  // Add at the component level with other state declarations
  const [generationState, setGenerationState] = useState<{
    status: string;
    message?: string;
    chunk?: string;
  }>({ status: 'initializing' });

  const generateSyllabus = async () => {
    if (!courseId || !user) {
      alert("Course not ready for syllabus generation");
      return;
    }

    setIsGeneratingSyllabus(true);
    setFileError(null);

    // Start an elapsed time counter
    let elapsedTimerId: NodeJS.Timeout | null = null;
    let elapsedSeconds = 0;

    const updateElapsedTime = () => {
      elapsedSeconds += 1;
      const elapsedElement = document.getElementById('elapsed-time');
      if (elapsedElement) {
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        elapsedElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    };

    elapsedTimerId = setInterval(updateElapsedTime, 1000);

    try {
      // Show time estimate alert with state information
      const alertElement = document.createElement('div');
      alertElement.innerHTML = `
        <div id="syllabus-progress-alert" class="fixed bottom-4 right-4 p-4 bg-blue-100 border border-blue-300 rounded-lg shadow-lg max-w-md z-50">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <p class="font-medium text-blue-800" id="generation-status-message">Initializing...</p>
              <p class="text-sm text-blue-700">Estimated time: approximately 5 minutes</p>
              <p class="text-sm text-blue-700">Elapsed: <span id="elapsed-time">0:00</span></p>
              <div id="generation-output" class="mt-2 text-xs text-blue-600 max-h-20 overflow-y-auto hidden"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(alertElement.firstElementChild!);

      const idToken = await user.getIdToken();

      // Track content chunks for debugging or display
      let contentChunks: string[] = [];

      // Generate the syllabus using the onStateChange callback to update UI
      const result = await generateCourseSyllabus(idToken, courseId, (state) => {
        // Update internal state
        setGenerationState(state);

        // Update the UI elements
        const statusElement = document.getElementById('generation-status-message');
        const outputElement = document.getElementById('generation-output');

        if (statusElement) {
          if (state.status === 'analysing') {
            statusElement.textContent = state.message || 'Analyzing document...';
          } else if (state.status === 'outputing') {
            statusElement.textContent = 'Generating syllabus outline...';

            // Show output container when generation starts
            if (outputElement) {
              outputElement.classList.remove('hidden');

              if (state.chunk) {
                contentChunks.push(state.chunk);
                // Append the latest chunks, keeping only the most recent output
                const recentChunks = contentChunks.slice(-3).join('');
                outputElement.textContent = recentChunks;
                outputElement.scrollTop = outputElement.scrollHeight;
              }
            }
          } else if (state.status === 'completed') {
            statusElement.textContent = 'Syllabus generation complete!';
          }
        }

        // You can also update button text via props if needed
        // For example: setGenerationButtonText(state.status === 'analysing' ? 'Analyzing...' : 'Generating...');
      });

      console.log("Raw syllabus result:", result);

      // Extract the course_outline array from the result
      if (!result || !result.course_outline || !Array.isArray(result.course_outline)) {
        console.error("Invalid syllabus format:", result);
        throw new Error("Invalid syllabus structure returned from server");
      }

      // Set the syllabus array
      setSyllabus(result.course_outline);
      setCurrentStep("review"); // Go to review step
      window.scrollTo(0, 0);

      // Update metadata with the course step
      await saveMetadata({
        course_title: courseTitle,
        description: courseDescription,
        create_course_process: {
          current_step: 4,
          is_creation_complete: false
        }
      });

    } catch (error) {
      console.error("Error generating syllabus:", error);
      setFileError(`Failed to generate syllabus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clear time tracker
      if (elapsedTimerId) clearInterval(elapsedTimerId);

      // Remove the alert element
      const alertElement = document.getElementById('syllabus-progress-alert');
      if (alertElement) alertElement.remove();

      setIsGeneratingSyllabus(false);
    }
  };

  // Adjusted handleNextClick to wait for auto-save
  const handleNextClick = async () => {
    // Scenario 1: Initial course creation (on title step, no courseId yet)
    if (currentStep === 'title' && !courseId && courseTitle.trim()) {
      if (isExplicitlyCreatingCourse) {
        console.log("[handleNextClick] Initial course creation already in progress. Click ignored.");
        return;
      }
      setIsExplicitlyCreatingCourse(true);
      clearAutoSaveTimer(); // Clear any pending useEffect auto-save timer
      console.log("[handleNextClick] Attempting initial course creation...");

      const savingOverlay = document.createElement('div');
      savingOverlay.innerHTML = `
        <div id="saving-overlay" class="fixed bottom-4 right-4 p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-lg z-50">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
            <div class="text-amber-800">Creating course...</div>
          </div>
        </div>
      `;
      document.body.appendChild(savingOverlay.firstElementChild!);

      let initialSavedCourse: Awaited<ReturnType<typeof autoSaveContent>> | null = null;
      try {
        initialSavedCourse = await autoSaveContent({ title: courseTitle }, true); // isExplicitAttempt = true

        if (!initialSavedCourse || !initialSavedCourse.id) {
          document.getElementById('saving-overlay')?.remove();
          showErrorNotification("Unable to create course. Please check your connection and try again.");
          return;
        }
        // courseId state will be set by autoSaveContent if successful or by goToNextStep
        console.log("[handleNextClick] Course created. ID: ", initialSavedCourse.id, ". Proceeding to next step logic.");
        await goToNextStep(initialSavedCourse.id); // Pass the new ID directly
      } catch (error) {
        console.error("[handleNextClick] Error during initial course creation:", error);
        showErrorNotification("An error occurred while creating the course.");
      } finally {
        document.getElementById('saving-overlay')?.remove(); // Ensure overlay is removed
        setIsExplicitlyCreatingCourse(false);
      }
      return; // Initial creation path ends here
    }

    // Scenario 2: Navigating from other steps, or title step if courseId already exists.
    // No explicit waiting for background saveStatus here. goToNextStep handles its own critical saves.
    console.log(`[handleNextClick] Proceeding with navigation from step: ${currentStep}`);
    if (currentStep === "upload") {
      // Syllabus generation is a distinct, blocking action from Upload step
      generateSyllabus();
    } else {
      await goToNextStep(); // Await this as it contains its own awaits for saving
    }
  };

  // --- Final Actions ---

  // Function to handle the final course creation process
  const handleFinalizeCourse = async () => {
    if (!user || !courseId) {
      console.error("Cannot finalize course: missing user or courseId");
      alert("An error occurred. Please try again.");
      return;
    }

    // Validate course has required data
    if (!courseTitle.trim()) {
      alert("Course title is required");
      return;
    }

    if (uploadedFilesInfo.length === 0) {
      alert("At least one file must be uploaded");
      return;
    }

    if (!syllabus || syllabus.length === 0) {
      alert("Course syllabus is required");
      return;
    }

    if (!aiVoice) {
      alert("Please select an AI voice for your course");
      return;
    }

    setIsSaving(true);

    try {
      const idToken = await user.getIdToken();

      // 1. First explicitly mark the course as complete using the updateCourseStep function
      console.log("Marking course as complete...");
      await updateStep(courseId, steps.length, true);

      // 2. Update all course data with the final values
      const courseData = {
        id: courseId,
        course_title: courseTitle,
        description: courseDescription,
        ai_voice: aiVoice,
        create_course_process: {
          current_step: steps.length, // Final step (should be 6 with the voice step)
          is_creation_complete: true  // Marked as complete
        }
      };

      console.log("Finalizing course with data:", courseData);
      await createOrUpdateCourseMetadata(idToken, courseData);

      // 3. Process the course content (textbook, syllabus, etc.)
      console.log("Processing course content...");
      await processCourseContent(idToken, courseId);

      // 4. Show success dialog and redirect to courses dashboard
      const successDialog = document.createElement('div');
      successDialog.innerHTML = `
        <div id="success-dialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div class="text-center">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">Course Created Successfully!</h3>
              <p class="text-gray-600 mb-6">Your course "${courseTitle}" has been created and is ready for students.</p>
              <button id="success-dialog-button" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Go to My Courses
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(successDialog.firstElementChild!);

      // Add click event listener to the button
      document.getElementById('success-dialog-button')?.addEventListener('click', () => {
        // Remove the dialog before navigation
        document.getElementById('success-dialog')?.remove();

        // Navigate to my-courses page
        router.push('/my-courses');
      });

      // Add animation styles
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `;
      document.head.appendChild(style);

    } catch (error) {
      console.error("Error finalizing course:", error);
      alert(`Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSaving(false);
    }
  };

  // --- Function to handle deleting the entire course ---
  const handleDiscardCourse = async () => {
    if (!courseId) {
      // If no courseId exists (e.g., user hasn't even entered a title yet), just go back
      router.push("/my-courses");
      return;
    }

    if (!user) {
      alert("Authentication error. Please log in again.");
      return;
    }

    setIsDeleting(true);
    try {
      const idToken = await user.getIdToken();
      await deleteCourse(idToken, courseId);
      console.log(`Course draft ${courseId} deleted.`);
      setIsDiscardDialogOpen(false);
      router.push("/my-courses"); // Navigate back to the courses list
    } catch (error) {
      console.error(`Error deleting course ${courseId}:`, error);
      alert(`Failed to discard draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Auto-Save Logic ---

  useEffect(() => {
    // Skip initial auto-save until user has edited or advanced to a step
    if (!courseId || !currentStep || currentStep === "title" && !courseTitle.trim()) {
      return;
    }

    // Only auto-save if it's been more than 30 seconds since the last save
    const now = new Date();
    if (lastSavedTime && now.getTime() - lastSavedTime.getTime() < 30000) {
      return;
    }

    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set a new timer
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        if (!user || !courseId) return;

        const idToken = await user.getIdToken();

        const saveData: Partial<CourseInfo> & { course_title: string } = {
          id: courseId,
          course_title: courseTitle,
          description: courseDescription,
          ai_voice: aiVoice,
          create_course_process: {
            current_step: steps.findIndex(step => step.id === currentStep) + 1,
            is_creation_complete: false
          }
        };

        console.log("Auto-saving course:", saveData);
        await autoSaveCourseContent(idToken, saveData);

        // Update save status indicators
        setLastSavedTime(new Date());
        setSaveStatus('saved');
        console.log("Auto-save completed successfully");
      } catch (error) {
        console.error("Auto-save failed:", error);
        // Don't show UI errors for auto-save failures
        setSaveStatus('idle');
      } finally {
        autoSaveTimerRef.current = null;
      }
    }, 3000); // Wait 3 seconds after last edit before saving

    // Clean up timer on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    courseId,
    courseTitle,
    courseDescription,
    aiVoice,
    currentStep,
    completedSteps,
    lastSavedTime,
    user
  ]);

  // --- Handle Step Navigation Logic ---

  const updateStepCompletion = useCallback(async (stepNumber: number, isComplete: boolean) => {
    if (!courseId || !user) return;

    try {
      const idToken = await user.getIdToken();

      const updatedCourse = await updateCourseStep(idToken, courseId, stepNumber, isComplete);
      console.log(`Step ${stepNumber} completion updated:`, updatedCourse);

      // Update local state to reflect the change
      if (isComplete && !completedSteps.includes(stepNumber)) {
        setCompletedSteps(prev => [...prev, stepNumber]);
      } else if (!isComplete && completedSteps.includes(stepNumber)) {
        setCompletedSteps(prev => prev.filter(step => step !== stepNumber));
      }
    } catch (error) {
      console.error(`Error updating step ${stepNumber} completion:`, error);
    }
  }, [courseId, user, completedSteps]);

  // New handler to view existing syllabus
  const handleViewSyllabus = async () => {
    if (!courseId || !user) {
      alert("Course not ready to view syllabus");
      return;
    }

    setIsLoadingSyllabus(true);
    setFileError(null);

    try {
      const idToken = await user.getIdToken();

      // Use the new API function instead of direct fetch
      const result = await retrieveCourseSyllabus(idToken, courseId);
      console.log("Retrieved syllabus result:", result);

      // Process the result
      if (!result || !result.course_outline || !Array.isArray(result.course_outline)) {
        console.error("Invalid syllabus format:", result);
        throw new Error("Invalid syllabus structure returned from server");
      }

      // Set the syllabus array
      setSyllabus(result.course_outline);
      setCurrentStep("review"); // Go to review step
      window.scrollTo(0, 0);

      // Update metadata with the course step
      await saveMetadata({
        course_title: courseTitle,
        description: courseDescription,
        create_course_process: {
          current_step: 4,
          is_creation_complete: false
        }
      });

    } catch (error) {
      console.error("Error retrieving syllabus:", error);

      // If it's a 404, suggest generating instead
      if (error instanceof Error && error.message.includes("not found")) {
        setFileError("No syllabus found. Please generate a new syllabus.");
      } else {
        setFileError(`Failed to retrieve syllabus: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsLoadingSyllabus(false);
    }
  };

  return (
    <div>
      <HeaderWithLogo />
      {/* Add discard dialog */}
      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 gap-2">
              <AlertCircle className="h-5 w-5" />
              Discard Course Draft
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to discard this course draft? This will permanently delete all your progress and work completed so far. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDiscardDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardCourse}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Discard Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add back navigation confirmation dialog */}
      <Dialog open={isBackDialogOpen} onOpenChange={setIsBackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-600 gap-2">
              <AlertCircle className="h-5 w-5" />
              Exit Course Creation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Your progress is being auto-saved, and you can continue editing this course later from your drafts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setIsBackDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => router.push("/my-courses")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Courses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top navigation bar */}
      <div className="w-full border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          {/* Back to My Courses button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center text-gray-600 hover:text-gray-800 -ml-2"
            onClick={() => setIsBackDialogOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 mr-1"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to My Courses
          </Button>

          {/* Right-aligned Discard button */}
          <div>
            {courseId && (
              <button
                onClick={() => setIsDiscardDialogOpen(true)}
                className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center p-2 rounded hover:bg-red-50 transition-colors duration-150"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard Course
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-8">
        {authLoading || isLoadingDraft ? (
          <div className="flex-1 flex items-center justify-center min-h-[500px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">{isLoadingDraft ? "Loading draft course..." : "Loading..."}</span>
          </div>
        ) : (
          <div className="flex gap-12 min-h-[500px] items-start">
            <div className="w-64 pt-4">
              <StepNavigation
                currentStep={currentStep}
                setCurrentStep={() => { /* No direct navigation */ }}
                isStepCompleted={isStepCompleted}
              />
            </div>

            <div className="flex-1 pt-4">
              {currentStep === "title" && (
                <TitleStep
                  courseTitle={courseTitle}
                  setCourseTitle={setCourseTitle}
                />
              )}

              {currentStep === "description" && (
                <DescriptionStep
                  courseDescription={courseDescription}
                  setCourseDescription={setCourseDescription}
                />
              )}

              {currentStep === "upload" && (
                <UploadStep
                  uploadedFilesInfo={uploadedFilesInfo}
                  onFileUpload={handleFileUpload}
                  onFileDelete={handleFileDelete}
                  pendingFileOperations={pendingFileOperations}
                  fileError={fileError}
                  setFileError={setFileError}
                  isGeneratingSyllabus={isGeneratingSyllabus}
                  validateFile={validateFile}
                />
              )}

              {currentStep === "review" && (
                <ReviewSyllabusStep
                  syllabus={syllabus}
                  setSyllabus={setSyllabus}
                />
              )}

              {currentStep === "voice" && (
                <SelectVoiceStep
                  aiVoice={aiVoice}
                  setAiVoice={setAiVoice}
                />
              )}

              {currentStep === "confirm" && (
                <ConfirmStep
                  courseTitle={courseTitle}
                  courseDescription={courseDescription}
                  uploadedFilesInfo={uploadedFilesInfo}
                  syllabus={syllabus}
                  aiVoice={aiVoice}
                  isCreatingCourse={isSaving}
                  handleCreateCourse={handleFinalizeCourse}
                />
              )}

              <NavigationButtons
                currentStep={currentStep}
                goToPreviousStep={goToPreviousStep}
                handleNextClick={handleNextClick}
                handleCreateCourse={handleFinalizeCourse}
                handleViewSyllabus={currentStep === 'upload' ? handleViewSyllabus : undefined}
                canProceedToNextStep={canProceedToNextStep}
                isGeneratingSyllabus={isGeneratingSyllabus}
                isCreatingCourse={isSaving}
                isLoadingSyllabus={isLoadingSyllabus}
                disableNext={currentStep === 'upload' && uploadedFilesInfo.length === 0}
                saveStatus={saveStatus}
                lastSavedTime={lastSavedTime}
                generationState={generationState}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 