"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { LightCourseLayout } from "@/components/layout/LightCourseLayout"
import { ChatInput } from "@/components/in-class/chat-input"
import { CourseControls } from "@/components/in-class/course-controls"
import { StatusMessage, StatusType } from "@/components/ui/status-message"
import { VapiAssistant, cleanupVapiAssistant } from "@/components/in-class/vapi-assistant"
import { fetchCourseSlides, saveCourseProgress } from "@/components/in-class/utils/api-endpoints"
import { SlideController } from "@/components/in-class/slide-controller"
import { io } from "socket.io-client"

// Interface for slides
interface Slide {
  id: number;
  title: string;
  slide_markdown: string;
  transcript: string;
  preview: string;
}

// Fallback slide to display while loading
const fallbackSlide: Slide = {
  id: 0,
  title: "Loading Course Content...",
  slide_markdown: "# Loading...\nPlease wait while we load your course content.",
  transcript: "Loading course content. Please wait a moment.",
  preview: "/pics/loading.jpg",
};

interface OnlineCourseParams {
  id: string;
}

export default function OnlineCourse({ params }: { params: OnlineCourseParams }) {
  const courseId = params.id
  const searchParams = useSearchParams()
  const assistantId = searchParams.get('assistant')

  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<StatusType>('info')
  const [showAssistant, setShowAssistant] = useState(true)
  const [slides, setSlides] = useState<Slide[]>([fallbackSlide])
  const [isLoading, setIsLoading] = useState(true)
  const [hasSlideContent, setHasSlideContent] = useState(true)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0) // For progress tracking
  const router = useRouter()
  const [socket, setSocket] = useState<any>(null); // Add socket state
  const [assistantLastSlide, setAssistantLastSlide] = useState<number | null>(null);
  const [showWelcomeBlock, setShowWelcomeBlock] = useState(true);

  const {
    currentSlide,
    setCurrentSlide,
    renderSlides,
    requestExplanation
  } = SlideController({
    slides,
    isLoading,
    hasSlideContent,
    assistantId,
    socket,
    showWelcomeBlock,
    onExplanationRequested: (slideIndex, message) => {
      setMessages(prev => [...prev, { role: "user", content: message }]);
      setCurrentSlideIndex(slideIndex);
    },
    courseId: courseId
  });

  // Create a ref to hold the latest setCurrentSlide function
  const setCurrentSlideRef = useRef(setCurrentSlide);
  useEffect(() => {
    setCurrentSlideRef.current = setCurrentSlide;
  }, [setCurrentSlide]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!assistantId) return;
    
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      newSocket.emit('join_course', { assistant_id: assistantId });
    });
    
    newSocket.on('slide_changed', (data) => {
      console.log('Slide changed from backend:', data);
      if (data.position !== undefined) {
        setCurrentSlideIndex(data.position);
        setAssistantLastSlide(data.position);
        
        // Use the ref to call the latest setCurrentSlide function
        if (setCurrentSlideRef.current) {
          setCurrentSlideRef.current(data.position);
        }
        
        if (showWelcomeBlock) {
          setShowWelcomeBlock(false);
        }
        
        newSocket.emit('update_viewing_slide', {
          assistant_id: assistantId,
          position: data.position
        });
      }
    });
    
    newSocket.on('assistant_activity', () => {
      console.log('Received assistant activity notification');
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, [assistantId]);

  // Sync current slide index for progress tracking
  useEffect(() => {
    setCurrentSlideIndex(currentSlide);
  }, [currentSlide]);

  // Fetch slides on component mount
  useEffect(() => {
    async function loadSlides() {
      if (courseId) {
        try {
          setIsLoading(true);
          setStatusMessage("Loading course content...");
          setStatusType("info");
          
          const slideData = await fetchCourseSlides(courseId);
          
          // Check if the response is empty or doesn't contain slides data
          if (!slideData || !Array.isArray(slideData) || slideData.length === 0) {
            throw new Error('No slide content available for this course');
          }
          
          // Transform the data to match the expected format if needed
          const formattedSlides = slideData.map((slide: any, index: number) => ({
            id: index + 1,
            title: slide.title || `Slide ${index + 1}`,
            slide_markdown: slide.content || slide.slide_markdown || "No content available.",
            transcript: slide.transcript || "No transcript available.",
            preview: slide.preview || `/pics/${(index % 3) + 1}.jpg`, // Fallback preview images
          }));
          
          setSlides(formattedSlides);
          setHasSlideContent(true);
          setStatusMessage("Course content loaded successfully!");
          setStatusType("success");
          
          // After a delay, clear the status message
          setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
          console.error("Error loading slides:", error);
          
          // Set a more descriptive error message based on the type of error
          const errorMessage = error instanceof Error 
            ? error.message 
            : "Failed to load course content. Please try again.";
            
          // Update UI to show error state
          setStatusMessage(errorMessage);
          setStatusType("error");
          setHasSlideContent(false);
          
          // Set an error slide to display
          setSlides([{
            id: 0,
            title: "Course Content Error",
            slide_markdown: `# Content Not Available\n\n${errorMessage}\n\nPlease try again later or contact support.`,
            transcript: "There was an error loading this course's content.",
            preview: "/pics/error.jpg",
          }]);
        } finally {
          setIsLoading(false);
        }
      }
    }
    
    loadSlides();
  }, [courseId]);

  // Handle status changes from the VAPI assistant
  const handleStatusChange = useCallback((message: string | null, type: StatusType) => {
    setStatusMessage(message);
    setStatusType(type);
  }, []);

  // Handle messages from the VAPI assistant
  const handleMessageReceived = useCallback((message: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content: message }]);
  }, []);

  // Save course progress
  const handleSaveProgress = useCallback(async () => {
    if (courseId) {
      try {
        await saveCourseProgress(courseId, currentSlideIndex);
        console.log("Course progress saved, slide:", currentSlideIndex);
      } catch (error) {
        console.error("Error saving course progress:", error);
      }
    }
  }, [courseId, currentSlideIndex]);

  // Add a handler to track assistant position
  const handleAssistantPositionChanged = useCallback((position: number) => {
    setAssistantLastSlide(position);
  }, []);

  // Handle exit from the course
  const handleExit = async () => {
    setIsExitDialogOpen(false);
    
    // First, hide the assistant component to prevent instance conflicts
    setShowAssistant(false);
    
    // Save progress before exiting
    await handleSaveProgress();

    // Clean up the VAPI assistant if one was created
    if (assistantId) {
      // Pass the last slide position the assistant explained
      await cleanupVapiAssistant(assistantId, assistantLastSlide, courseId);
    }

    // Navigate back to courses page
    setTimeout(() => {
      router.push("/my-courses");
    }, 100);
  };

  // Save progress periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      handleSaveProgress();
    }, 60000); // Save every minute

    return () => clearInterval(saveInterval);
  }, [handleSaveProgress]);

  // Add fullscreen toggle function
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Fullscreen error: ${err.message}`)
      })
      setIsFullScreen(true)
    } else {
      document.exitFullscreen()
      setIsFullScreen(false)
    }
  }

  // Add fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, []);

  // Get current course title
  const courseTitle = slides.length > 0 && !isLoading
    ? `${slides[0].title.split(' - ')[0]}: ${slides[currentSlideIndex].title}`
    : "Loading Course...";

  return (
    <LightCourseLayout title={courseTitle}>
      {/* Status message display */}
      <StatusMessage
        message={statusMessage}
        type={statusType}
        duration={5000}
        onClose={() => setStatusMessage(null)}
      />

      {/* Course control buttons */}
      <CourseControls 
        onExitClick={() => setIsExitDialogOpen(true)}
        isFullScreen={isFullScreen}
        toggleFullScreen={toggleFullScreen}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Render slides and controls using the SlideController */}
      {renderSlides()}

      {/* Chat input - only show if we have valid content AND not showing welcome block */}
      {hasSlideContent && !showWelcomeBlock && (
        <div className="mx-auto px-6 max-w-[1800px] w-full">
          <ChatInput
            courseId={courseId}
            slideIndex={currentSlideIndex}
          />
        </div>
      )}

      {/* AI Assistant Component - Only show when enabled AND we have valid content */}
      {assistantId && showAssistant && hasSlideContent && (
        <VapiAssistant
          assistantId={assistantId}
          onStatusChange={handleStatusChange}
          onMessageReceived={handleMessageReceived}
          onPositionChanged={handleAssistantPositionChanged}
          socket={socket}
          isWelcomeBlockVisible={showWelcomeBlock}
        />
      )}

      {/* Exit Dialog */}
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle>Leave Course?</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to exit this course? Your progress will be saved.
              {assistantId && hasSlideContent && " Your AI assistant call will be ended."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsExitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleExit}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Exit Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LightCourseLayout>
  )
}