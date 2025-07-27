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
import { LogOut, ChevronLeft, ChevronRight, Home, Info, Share2, Fullscreen, Minimize, Menu, MessageCircle, Grid, X, Mic, MicOff, Send, Settings2, ChevronDown } from "lucide-react"
import { LightCourseLayout } from "@/components/layout/LightCourseLayout"
import { ChatInput } from "@/components/in-class/chat-input"
import { StatusMessage, StatusType } from "@/components/ui/status-message"
import { VapiAssistant, cleanupVapiAssistant } from "@/components/in-class/vapi-assistant"
import { fetchCourseSlides, saveCourseProgress } from "@/components/in-class/utils/api-endpoints"
import { io } from "socket.io-client"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

// Interface for slides
interface Slide {
  id: number;
  title: string;
  slide_markdown: string;
  transcript: string;
  preview: string;
  subtopic_title?: string;
  section_title?: string;
}

// Slide section type for syllabus
interface SyllabusSlideItem {
  databaseId: number; // Original slide ID from backend
  arrayIndex: number; // Index in the main slides array
  title: string;
}

interface SyllabusSubtopic {
  title: string;
  slides: SyllabusSlideItem[];
}

interface SyllabusChapter {
  title: string;
  subtopics: SyllabusSubtopic[];
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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showSyllabus, setShowSyllabus] = useState(true)
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)
  const [showChatInput, setShowChatInput] = useState(false)
  const [syllabusStructure, setSyllabusStructure] = useState<SyllabusChapter[]>([])
  const [courseName, setCourseName] = useState("Haihaihai") // TODO: get course name from backend through course_info.json file
  const router = useRouter()
  const [socket, setSocket] = useState<any>(null);
  const [assistantLastSlide, setAssistantLastSlide] = useState<number | null>(null);
  const [showWelcomeBlock, setShowWelcomeBlock] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const previewItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const syllabusChapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const syllabusSlideItemRefs = useRef<{[key: number]: HTMLLIElement | null}>({});
  const [activeLeftTab, setActiveLeftTab] = useState<'syllabus' | 'record'>('syllabus');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [highlightedSlideId, setHighlightedSlideId] = useState<number | null>(null);

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!assistantId) return;
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      newSocket.emit('join_course', { assistant_id: assistantId });
    });
    
    newSocket.on('slide_changed', (data) => {
      if (data.position !== undefined) {
        setCurrentSlideIndex(data.position);
        setAssistantLastSlide(data.position);
        
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
  }, [assistantId, showWelcomeBlock]);

  // Fetch slides on component mount
  useEffect(() => {
    async function loadSlides() {
      if (courseId) {
        try {
          setIsLoading(true);
          setStatusMessage("Loading course content...");
          setStatusType("info");
          
          const slideData = await fetchCourseSlides(courseId);
          
          if (!slideData || !Array.isArray(slideData) || slideData.length === 0) {
            throw new Error('No slide content available for this course');
          }
          
          // Transform the data to match the expected format
          const formattedSlides = slideData.map((slide: any, index: number) => ({
            id: slide.id,
            title: slide.title || `Slide ${index + 1}`,
            slide_markdown: slide.slide_markdown || "No content available.",
            transcript: slide.transcript || "No transcript available.",
            preview: slide.preview || `/pics/${(index % 3) + 1}.jpg`,
            subtopic_title: slide.subtopic_title || "General",
            section_title: slide.section_title || "Main Section",
          }));
          
          setSlides(formattedSlides);
          
          // Extract course name from first slide if possible
          if (formattedSlides[0]?.title && !courseName && courseId !== "default-course-id") {
            const parts = formattedSlides[0].title.split(':');
            if (parts.length > 0) {
              // setCourseName(parts[0].trim());
            }
          }
          
          // Generate sections for syllabus
          const generatedSyllabus = generateSyllabusStructure(formattedSlides);
          setSyllabusStructure(generatedSyllabus);
          
          // Initialize expandedChapters state - default all to true (expanded)
          const initialExpandedState: Record<string, boolean> = {};
          generatedSyllabus.forEach(chapter => {
            initialExpandedState[chapter.title] = true;
          });
          setExpandedChapters(initialExpandedState);
          
          setHasSlideContent(true);
          setStatusMessage("Course content loaded successfully!");
          setStatusType("success");
          
          setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
          console.error("Error loading slides:", error);
          
          const errorMessage = error instanceof Error 
            ? error.message 
            : "Failed to load course content. Please try again.";
            
          setStatusMessage(errorMessage);
          setStatusType("error");
          setHasSlideContent(false);
          
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

  // Generate sections from slides (group by subtopic_title)
  const generateSyllabusStructure = (slidesToProcess: Slide[]): SyllabusChapter[] => {
    const chapterMap = new Map<string, { title: string, subtopicMap: Map<string, SyllabusSubtopic> }>();

    slidesToProcess.forEach((slide, index) => {
      const chapterTitle = slide.section_title || 'Unnamed Section';
      const subtopicTitle = slide.subtopic_title || 'Unnamed Subtopic';

      if (!chapterMap.has(chapterTitle)) {
        chapterMap.set(chapterTitle, { title: chapterTitle, subtopicMap: new Map<string, SyllabusSubtopic>() });
      }

      const chapterEntry = chapterMap.get(chapterTitle)!;

      if (!chapterEntry.subtopicMap.has(subtopicTitle)) {
        chapterEntry.subtopicMap.set(subtopicTitle, { title: subtopicTitle, slides: [] });
      }

      const subtopicEntry = chapterEntry.subtopicMap.get(subtopicTitle)!;
      
      // Process slide title to remove subtopic prefix if present
      let displaySlideTitle = slide.title;
      const prefixToRemove = subtopicTitle + ": ";
      if (slide.title.startsWith(prefixToRemove)) {
        displaySlideTitle = slide.title.substring(prefixToRemove.length);
      }

      subtopicEntry.slides.push({
        databaseId: slide.id,
        arrayIndex: index,
        title: displaySlideTitle, // Use the processed title
      });
    });

    return Array.from(chapterMap.values()).map(chapterEntry => ({
      title: chapterEntry.title,
      subtopics: Array.from(chapterEntry.subtopicMap.values()),
    }));
  };

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

  // Navigate to previous slide
  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
      if (socket && assistantId) {
        socket.emit('update_viewing_slide', {
          assistant_id: assistantId,
          position: currentSlideIndex - 1
        });
      }
    }
  };

  // Navigate to next slide
  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      if (socket && assistantId) {
        socket.emit('update_viewing_slide', {
          assistant_id: assistantId,
          position: currentSlideIndex + 1
        });
      }
    }
  };

  // Go to specific slide
  const goToSlide = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < slides.length) {
      setCurrentSlideIndex(newIndex);
      if (socket && assistantId) {
        socket.emit('update_viewing_slide', {
          assistant_id: assistantId,
          position: newIndex
        });
      }
      
      // Scroll the corresponding preview item into view
      setTimeout(() => {
        previewItemRefs.current[newIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 0); 

      // Find the chapter for the new slide index and ensure it's expanded
      let targetChapterTitle: string | null = null;
      for (const chapter of syllabusStructure) {
        for (const subtopic of chapter.subtopics) {
          if (subtopic.slides.some(s => s.arrayIndex === newIndex)) {
            targetChapterTitle = chapter.title;
            break;
          }
        }
        if (targetChapterTitle) break;
      }

      if (targetChapterTitle && !expandedChapters[targetChapterTitle]) {
        // If chapter is not expanded, expand it. The useEffect will handle scrolling.
        toggleChapterExpansion(targetChapterTitle);
      }

      // On mobile, close the syllabus after selecting a slide
      if (isMobile) {
        setShowSyllabus(false);
      }
    }
  };

  // Get current slide progress percentage
  const slideProgress = slides.length > 1 
    ? Math.round((currentSlideIndex / (slides.length - 1)) * 100) 
    : 0;

  // Get current slide
  const currentSlide = slides[currentSlideIndex] || fallbackSlide;

  // Toggle syllabus visibility
  const toggleSyllabus = () => {
    setShowSyllabus(prev => !prev);
  };

  // Toggle preview panel visibility
  const togglePreviewPanel = () => {
    setShowPreviewPanel(prev => !prev);
  };

  // Toggle chat input visibility
  const toggleChatInput = () => {
    setShowChatInput(prev => !prev);
  };

  // Toggle mute status
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  // Handle input message change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      // Add your message sending logic here
      console.log("Sending message:", inputMessage);
      setInputMessage("");
    }
  };

  // Handle key press for input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render markdown with improved styling
  function marked(markdown: string): string {
    // Style to match the screenshot with blue headings and proper bullet points
    return markdown
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-[#0070C0] border-b border-[#0070C0] pb-2 mb-6">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-4">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-800 mt-5 mb-3">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="text-emerald-600">$1</em>')
      .replace(/- (.*)/gim, '<div class="flex items-start mb-3"><span class="text-lg mr-2 mt-1 text-black">•</span><span class="flex-1 text-black">$1</span></div>')
      .replace(/\n/gim, '<br>');
  }

  const toggleChapterExpansion = (chapterTitle: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterTitle]: !prev[chapterTitle]
    }));
  };

  // Effect to scroll to the active slide item when it changes
  useEffect(() => {
    if (syllabusStructure.length === 0) return;

    // Find the slide item ref for the current slide
    const slideItemElement = syllabusSlideItemRefs.current[currentSlideIndex];
    
    if (slideItemElement) {
      // If we found the slide item element, scroll to it
      setTimeout(() => {
        slideItemElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest', // 'nearest' is usually better for small items
        });
        
        // Trigger highlight animation
        setHighlightedSlideId(currentSlideIndex);
        setTimeout(() => setHighlightedSlideId(null), 1500); // Clear after animation
      }, 100);
    }
  }, [currentSlideIndex, syllabusStructure, expandedChapters]);

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0D] text-white p-3">
      {/* Top navigation bar */}
      <header className="bg-[#0D0D0D] text-white py-2 px-3 sm:px-4 flex items-center justify-between shadow-md z-10 border-b border-gray-800 mb-2">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-[#1A1A1A] rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center"
            onClick={() => router.push('/my-courses')}
            title="Home"
          >
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-[#1A1A1A] rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center"
            onClick={toggleSyllabus}
            title="Toggle Syllabus"
          >
            <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
        
        <h1 className="text-base sm:text-lg font-medium truncate text-center px-2 sm:px-4 flex-1">
          {courseName}
        </h1>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-[#1A1A1A] rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center"
            onClick={togglePreviewPanel}
            title="Toggle Slide Previews"
          >
            <Grid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-[#1A1A1A] rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center"
            onClick={() => {}}
            title="Info"
          >
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-[#1A1A1A] rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center"
            onClick={() => {}}
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </header>

      {/* Main content area - with gap between columns */}
      <div className="flex flex-1 overflow-hidden bg-[#0D0D0D] gap-x-2 sm:gap-x-3">
        {/* Syllabus sidebar */}
        <aside 
          className={cn(
            "bg-[#1A1A1A] border-r border-gray-800 w-full md:w-64 flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out transform scrollbar-none rounded-sm",
            showSyllabus ? "translate-x-0" : "-translate-x-full md:hidden",
            isMobile ? "absolute z-30 h-[calc(100%-48px)] top-[48px]" : "relative"
          )}
          style={{ 
            msOverflowStyle: 'none', 
            scrollbarWidth: 'none' 
          }}
        >
          <div className="p-3">
            <div className="flex space-x-1 pb-3 border-b border-gray-800">
              <button 
                className={cn(
                  "text-base font-medium px-3 py-1 rounded-t-md w-1/2 text-center",
                  activeLeftTab === 'syllabus' 
                    ? "text-white border-b-2 border-white bg-[#1A1A1A]"
                    : "text-[#CCCCCC] hover:text-white hover:bg-[#1F1F1F]"
                )}
                onClick={() => setActiveLeftTab('syllabus')}
              >
                Syllabus
              </button>
              <button 
                className={cn(
                  "text-base font-medium px-3 py-1 rounded-t-md w-1/2 text-center",
                  activeLeftTab === 'record' 
                    ? "text-white border-b-2 border-white bg-[#1A1A1A]"
                    : "text-[#CCCCCC] hover:text-white hover:bg-[#1F1F1F]"
                )}
                onClick={() => setActiveLeftTab('record')}
              >
                Record
              </button>
            </div>
          </div>
          
          {activeLeftTab === 'syllabus' && (
            <nav className="p-3 pt-0 overflow-y-auto scrollbar-none" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {syllabusStructure.map((chapter, chapterIndex) => (
                <div 
                  key={chapter.title} 
                  ref={(el: HTMLDivElement | null) => { syllabusChapterRefs.current[chapterIndex] = el; }}
                  className="mb-1.5"
                >
                  <button 
                    onClick={() => toggleChapterExpansion(chapter.title)}
                    className="flex items-center justify-between w-full mb-1.5 px-1.5 py-2 tracking-tight text-left"
                  > 
                    <h3 className="text-base font-semibold text-white">{chapter.title}</h3> 
                    {expandedChapters[chapter.title] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </button>
                  {expandedChapters[chapter.title] && (
                    <div className="ml-2 pb-2">
                      {chapter.subtopics.map((subtopic: SyllabusSubtopic) => (
                        <div key={subtopic.title} className="mb-1">
                          <h4 className="text-sm font-medium text-gray-300 px-1.5 py-1 mb-0.5 tracking-tight">{subtopic.title}</h4>
                          <ul className="ml-2 space-y-1">
                            {subtopic.slides.map((slideItem: SyllabusSlideItem) => (
                              <li 
                                key={slideItem.databaseId}
                                ref={(el) => { syllabusSlideItemRefs.current[slideItem.arrayIndex] = el; }}
                                className={cn(
                                  currentSlideIndex === slideItem.arrayIndex && highlightedSlideId === slideItem.arrayIndex
                                    ? "bg-gray-700/40 transition-colors duration-700" // Highlight animation
                                    : ""
                                )}
                              >
                                <button
                                  onClick={() => goToSlide(slideItem.arrayIndex)}
                                  className="text-left w-full px-1.5 py-1.5 text-sm leading-normal flex items-center"
                                >
                                  <span 
                                    className={cn(
                                      "mr-2.5 rounded-full flex-shrink-0 transition-all duration-200 ease-out", // Added transition
                                      currentSlideIndex === slideItem.arrayIndex
                                        ? "bg-[#FF3B30] h-2.5 w-2.5" // Active: larger red dot
                                        : "bg-gray-600 h-2 w-2"    // Inactive: smaller gray dot
                                    )}
                                  ></span>
                                  <span 
                                    className={cn(
                                      currentSlideIndex === slideItem.arrayIndex 
                                        ? "text-white font-medium"  
                                        : "text-[#CCCCCC] hover:text-white font-normal"
                                    )}
                                  >
                                    {slideItem.title}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}

          {activeLeftTab === 'record' && (
            <div className="p-3 text-[#CCCCCC]">
              <h3 className="text-base font-semibold text-white mb-2">Recordings & Notes</h3>
              <p className="text-sm mb-4">This section will contain your recorded audio, synchronized transcripts, and personal notes for each slide.</p>
              <div className="border border-dashed border-gray-700 rounded-md p-6 text-center">
                <p className="text-gray-500">No recordings or notes available yet.</p>
                <p className="text-xs text-gray-600 mt-1">Use the microphone during your session to record.</p>
              </div>
              <p className="text-xs text-gray-600 mt-3">// TODO: Implement full Record column functionality.</p>
            </div>
          )}
        </aside>

        {/* Slide content area + Subtitle (Center Column) */}
        <main className={cn(
          "flex-1 overflow-hidden flex flex-col bg-[#1A1A1A] rounded-sm transition-all duration-300 ease-in-out",
        )}>
          {/* Status message */}
          <StatusMessage
            message={statusMessage}
            type={statusType}
            duration={5000}
            onClose={() => setStatusMessage(null)}
          />

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D] bg-opacity-80 z-50">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Paper content wrapper (slide + subtitle) - This will fill the main column */}
          <div className="flex-1 flex flex-col overflow-hidden p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-5">
            {/* Main slide content container - Takes flexible space */}
            <div className={cn(
              "w-full mx-auto flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
              (!showSyllabus || !showPreviewPanel) ? "max-w-full" : "max-w-full lg:max-w-6xl" // Expand if EITHER sidebar is hidden
            )}>
              <div className="relative w-full h-auto" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */} 
                <div className="absolute inset-0 bg-white text-black overflow-y-auto scrollbar-none rounded-sm shadow-xl">
                  <div className="p-3 sm:p-4 md:p-6 lg:p-8">
                    <div 
                      className="prose prose-sm sm:prose-base lg:prose-lg max-w-none" 
                      dangerouslySetInnerHTML={{ 
                        __html: currentSlide.slide_markdown 
                          ? marked(currentSlide.slide_markdown) 
                          : '<p>No content available.</p>' 
                      }} 
                    />
                    <div className="flex justify-end mt-3 sm:mt-4">
                      <img 
                        src="/pics/mascot.png" 
                        alt="Helper character" 
                        className="h-16 sm:h-20 md:h-24 w-auto" 
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
              
            {/* Caption block at bottom - Direct child of the flex container, fixed height */}
            <div className={cn(
              "w-full mx-auto bg-[#0D0D0D] text-white text-left mt-3 rounded-sm shadow-xl flex flex-shrink-0",
              (!showSyllabus || !showPreviewPanel) ? "max-w-full" : "max-w-full lg:max-w-6xl", // Expand if EITHER sidebar is hidden
              "h-12 sm:h-14 md:h-16 lg:h-20 xl:h-24" // Reduced responsive height
            )}> 
              <div className="w-full px-4 py-2 md:py-3 overflow-y-auto scrollbar-none"> 
                <p className="text-sm md:text-base font-medium">
                  {currentSlide.transcript || "Slide transcript or summary."}
                </p>
              </div>
            </div>
          </div>
        </main>
          
        {/* Right sidebar for slide previews */}
        <aside 
          className={cn(
            "bg-[#1A1A1A] border-l border-gray-800 w-full md:w-72 flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out transform scrollbar-none rounded-sm",
            showPreviewPanel ? "translate-x-0" : "translate-x-full md:hidden",
            isMobile ? "absolute right-0 z-30 h-[calc(100%-48px)] top-[48px]" : "relative"
          )}
          style={{ 
            msOverflowStyle: 'none', 
            scrollbarWidth: 'none' 
          }}
        >
          <div className="sticky top-0 bg-[#1A1A1A] border-b border-gray-800 z-10 flex justify-between items-center p-3">
            <h2 className="text-sm font-medium text-white pl-1">Slide Previews</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-300 hover:text-white hover:bg-[#0D0D0D] h-6 w-6 p-0.5 rounded-md"
              onClick={togglePreviewPanel}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="p-2 overflow-y-auto scrollbar-none" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {slides.map((slide, index) => (
              <div 
                key={slide.id} 
                ref={(element: HTMLDivElement | null) => { previewItemRefs.current[index] = element; }}
                className={cn(
                  "mb-3 rounded overflow-hidden cursor-pointer transition-all border",
                  currentSlideIndex === index 
                    ? "border-[#00FF84]" 
                    : "border-gray-800 hover:border-gray-700"
                )}
                onClick={() => goToSlide(index)}
              >
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 aspect ratio for previews too */}
                  <img 
                    src={slide.preview || `/pics/${(index % 3) + 1}.jpg`}
                    alt={`Preview of slide ${index + 1}`}
                    className="absolute inset-0 object-cover w-full h-full"
                  />
                  {currentSlideIndex === index && (
                    <div className="absolute inset-0 border-2 border-[#00FF84] pointer-events-none"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Full-width Bottom Action Bar */} 
      <div className="bg-[#0D0D0D] text-white py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between border-t border-gray-800 shadow-md z-10 mt-2">
        {/* Left Aligned: Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-[#1A1A1A] rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center flex-shrink-0"
          title="Settings"
          onClick={() => {}} // Placeholder for settings
        >
          <Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>

        {/* Centered Group: Mic, Input, Maximize - This group aligns with slide content width */}
        <div className="flex-1 flex px-2 sm:px-4">
          <div className={cn(
            "flex items-center space-x-2 sm:space-x-3 w-full transition-all duration-300 ease-in-out mx-auto",
            (!showSyllabus && !showPreviewPanel)
              ? "max-w-full lg:max-w-6xl xl:max-w-7xl"
              : "max-w-full lg:max-w-5xl xl:max-w-6xl"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center flex-shrink-0",
                isMuted 
                  ? "bg-[#FF3B30] text-white hover:bg-red-700" 
                  : "bg-[#1A1A1A] text-white hover:bg-gray-700"
              )}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
            
            <div className="flex-1 min-w-0 px-1 sm:px-2">
              <div className="flex items-center bg-[#1A1A1A] rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Start typing here..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-xs sm:text-sm py-0.5"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  title="Send Message"
                >
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-[#1A1A1A] rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center flex-shrink-0"
              onClick={toggleFullScreen}
              title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullScreen ? <Minimize className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Fullscreen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
          </div>
        </div>

        {/* Right Aligned: Quit */}
        <Button
          variant="ghost"
          size="icon"
          className="bg-red-600 text-white hover:bg-red-700 rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center flex-shrink-0"
          onClick={() => setIsExitDialogOpen(true)}
          title="Exit Course"
        >
          <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Add CSS to hide scrollbars and style elements - Ensure bullet points in .prose (on white bg) are dark */}
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-none {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* Custom scrollbar for transcript - REMOVED as per request to hide scrollbar UI */
        /*
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent; 
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #555; 
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #777; 
        }
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #555 transparent;
        }
        */
        
        /* Custom styles for blue headings like in the screenshot */
        .prose h1 {
          color: #0070C0; /* Microsoft Blue for slide titles */
          font-size: 1.75rem;
          border-bottom: 1px solid #0070C0;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
          line-height: 1.2;
        }
        .prose h2, .prose h3, .prose p, .prose strong, .prose em {
          color: #000000; /* Ensure text on white slide is black */
        }
        
        /* Better bullet point styling for white background */
        .prose ul {
          list-style-type: none;
          padding-left: 0;
        }
        
        .prose ul li {
          position: relative;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
          font-size: 1rem;
          color: #000000; /* Ensure list item text is black */
        }
        
        .prose ul li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: #000000; /* Black bullet points */
          font-size: 1.25rem;
        }
      `}</style>

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
        <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Leave Course?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to exit this course? Your progress will be saved.
              {assistantId && hasSlideContent && " Your AI assistant call will be ended."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsExitDialogOpen(false)}
              className="border-gray-700 text-gray-100 hover:text-white hover:bg-[#0D0D0D]"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0070C0] hover:bg-blue-700 text-white"
              onClick={handleExit}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Exit Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
