"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/auth/firebase"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadedFile } from "@/components/my-uploads/utils-backup/file-management"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import {
  CourseHeader,
  GeneralInfoTab,
  SyllabusTab,
  SlidesTab,
  CourseData,
  SlidePreviewModal
} from "@/components/my-courses/view-courses-details-user-created"
import {
  fetchCourseDetails,
  updateCourseDetails,
  retrieveCourseSlides
} from "@/components/my-courses/utils/course-api-endpoints"
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Info, ChevronLeft, ChevronRight, ExternalLink, BookOpen, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from 'react-markdown'

// Add a new interface for the slide type
interface CourseSlide {
  id: number;
  local_id: number;
  title: string;
  slide_markdown: string;
  transcript: string;
  preview: string;
  preview_path: string;
  subtopic_id: number;
  subtopic_title: string;
  section_id: number;
  section_title: string;
  prev_slide: number | null;
  next_slide: number | null;
  position: number;
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [aiVoice, setAiVoice] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Auto-save states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Slide preview state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewSlides, setPreviewSlides] = useState<CourseData['slides']>([]);
  const [initialSlideId, setInitialSlideId] = useState<string | undefined>(undefined);

  // Slides data state
  const [slidesData, setSlidesData] = useState<CourseSlide[] | null>(null);
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);
  const [slidesError, setSlidesError] = useState<string | null>(null);
  const [slidesFetchAttempted, setSlidesFetchAttempted] = useState(false);

  // State for selected slide and section view
  const [currentSlideId, setCurrentSlideId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [filteredSection, setFilteredSection] = useState<number | null>(null);

  // Ref for scrolling to slides
  const slideDetailRef = useRef<HTMLDivElement>(null);

  // Fetch course details when the component mounts
  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize
    if (!user) {
      setError("Please sign in to view course details");
      setLoading(false);
      return;
    }

    async function loadCourseDetails() {
      setLoading(true);
      try {
        const idToken = user ? await user.getIdToken() : '';

        if (!idToken) {
          setError("Authentication error. Please sign in to view course details.");
          setLoading(false);
          return;
        }

        const courseDetails = await fetchCourseDetails(idToken, params.id);
        setCourse(courseDetails);

        // Set form state from course details
        setTitle(courseDetails.title);
        setInstructor(courseDetails.instructor);
        setAiVoice(courseDetails.aiVoice);
        setDescription(courseDetails.description);
        setFiles(courseDetails.files as unknown as UploadedFile[]);

        setLoading(false);
      } catch (error) {
        console.error("Error loading course details:", error);
        setError("Failed to load course details. Please try again later.");
        setLoading(false);
      }
    }

    loadCourseDetails();
  }, [params.id, user, authLoading]);

  // Clean up auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Auto-save indicator timeout
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000); // Reset after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Function to toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Function to auto-save course details
  const autoSaveCourseDetails = useCallback(async () => {
    if (!user || !course || !params.id) return;

    // Skip if we're already saving
    if (saveStatus === 'saving') return;

    setSaveStatus('saving');

    try {
      const idToken = await user.getIdToken();

      // Call the API to update course details
      await updateCourseDetails(idToken, params.id, {
        title,
        description,
        aiVoice
        // instructor is not updated since it's stored as author in backend
      });

      // Update local state
      setCourse(prev => {
        if (!prev) return null;

        return {
          ...prev,
          title,
          instructor, // Keep this in local state only
          aiVoice,
          description,
          files: files.map(file => ({
            id: file.id || `file_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            name: file.name,
            size: typeof file.size === 'string' ? file.size : `${Math.round(Number(file.size) / 1024)} KB`,
            type: file.type
          }))
        };
      });

      setSaveStatus('saved');
      setLastSavedTime(new Date());
      console.log("Course details auto-saved successfully");
    } catch (error) {
      console.error("Error auto-saving course details:", error);
      setSaveStatus('idle');
      // Don't show alert for normal auto-saves, only when explicitly requested
    }
  }, [user, course, params.id, title, description, aiVoice, instructor, files, saveStatus]);

  // Add auto-save effect for input changes
  useEffect(() => {
    // Skip if no course loaded or user isn't authenticated yet
    if (!course || !user) return;

    // Skip if we're already saving
    if (saveStatus === 'saving') return;

    // Clear any existing timeout
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set a new timeout for auto-save (debounce)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveCourseDetails();
    }, 1500); // Auto-save after 1.5 seconds of inactivity

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, aiVoice, instructor]); // Only auto-save when these values change

  // Handle preview slide for a specific topic and subtopic
  const handlePreviewSlide = (topicId: string, subtopicId: string) => {
    if (!course) return;

    // Filter slides for this topic/subtopic
    const slidesToPreview = course.slides.filter(
      slide => slide.topicId === topicId && slide.subtopicId === subtopicId
    );

    if (slidesToPreview.length > 0) {
      setPreviewSlides(slidesToPreview);
      setInitialSlideId(slidesToPreview[0].id);
      setIsPreviewModalOpen(true);
    }
  };

  // Handle preview slide by slideId (for SlidesTab)
  const handlePreviewSlideById = (slideId: string) => {
    if (!course) return;

    const slide = course.slides.find(slide => slide.id === slideId);

    if (slide) {
      // Get all slides from the same topic/subtopic for a coherent presentation
      const relatedSlides = course.slides.filter(
        s => s.topicId === slide.topicId && s.subtopicId === slide.subtopicId
      );

      setPreviewSlides(relatedSlides);
      setInitialSlideId(slideId);
      setIsPreviewModalOpen(true);
    }
  };

  // Modified useEffect to prevent infinite loop
  useEffect(() => {
    // Only fetch slides when:
    // 1. The slides tab is active
    // 2. We haven't already attempted to fetch slides (regardless of success)
    // 3. We're not currently loading
    // 4. User is authenticated
    if (activeTab === "slides" && !slidesFetchAttempted && !isLoadingSlides && user) {
      const fetchSlides = async () => {
        setIsLoadingSlides(true)
        setSlidesError(null)

        try {
          const idToken = await user.getIdToken()
          const result = await retrieveCourseSlides(idToken, params.id)
          console.log("Retrieved slides:", result)
          setSlidesData(result.slides)
        } catch (error) {
          console.error("Error fetching slides:", error)
          setSlidesError(`Failed to load slides: ${error instanceof Error ? error.message : 'Unknown error'}`)
          // Even if there's an error, we've still attempted to fetch
        } finally {
          setIsLoadingSlides(false)
          // Mark that we've attempted to fetch slides, so we don't try again
          setSlidesFetchAttempted(true)
        }
      }

      fetchSlides()
    }
  }, [activeTab, slidesFetchAttempted, isLoadingSlides, user, params.id])

  // Add a reset function if the user wants to retry
  const handleRetryFetchSlides = async () => {
    if (!user) return

    setIsLoadingSlides(true)
    setSlidesError(null)

    try {
      const idToken = await user.getIdToken()
      const result = await retrieveCourseSlides(idToken, params.id)
      setSlidesData(result.slides)
    } catch (error) {
      console.error("Error fetching slides on retry:", error)
      setSlidesError(`Failed to load slides: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingSlides(false)
    }
  }

  // Set initial slide when slides are loaded
  useEffect(() => {
    if (slidesData && slidesData.length > 0 && currentSlideId === null) {
      setCurrentSlideId(slidesData[0].id);
    }
  }, [slidesData, currentSlideId]);

  // Handle slide navigation
  const navigateToSlide = (slideId: number) => {
    setCurrentSlideId(slideId);
    setViewMode('detail');
    // Scroll to detail view
    if (slideDetailRef.current) {
      slideDetailRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Get current slide data
  const getCurrentSlide = (): CourseSlide | undefined => {
    if (!slidesData || currentSlideId === null) return undefined;
    return slidesData.find(slide => slide.id === currentSlideId);
  };

  // Navigate to next/previous slide
  const goToNextSlide = () => {
    const currentSlide = getCurrentSlide();
    if (currentSlide?.next_slide) {
      navigateToSlide(currentSlide.next_slide);
    }
  };

  const goToPrevSlide = () => {
    const currentSlide = getCurrentSlide();
    if (currentSlide?.prev_slide) {
      navigateToSlide(currentSlide.prev_slide);
    }
  };

  // Get unique sections for filtering
  const getUniqueSections = (): { id: number; title: string }[] => {
    if (!slidesData) return [];

    const sections = new Map<number, string>();
    slidesData.forEach(slide => {
      sections.set(slide.section_id, slide.section_title);
    });

    return Array.from(sections.entries()).map(([id, title]) => ({ id, title }));
  };

  // Filter slides by section
  const filterSlidesBySection = (sectionId: number | null) => {
    setFilteredSection(sectionId);
    // Reset to grid view when changing filters
    setViewMode('grid');
  };

  // Get slides to display based on filter
  const getDisplayedSlides = (): CourseSlide[] => {
    if (!slidesData) return [];

    if (filteredSection === null) {
      return slidesData;
    }

    return slidesData.filter(slide => slide.section_id === filteredSection);
  };

  const renderSlideContent = () => {
    const currentSlide = getCurrentSlide();
    if (!currentSlide) return null;

    return (
      <div ref={slideDetailRef} className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4">
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="bg-white/20 text-white mb-2">
              {currentSlide.section_title} ⟩ {currentSlide.subtopic_title}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className="text-white hover:bg-white/20"
            >
              Back to Grid
            </Button>
          </div>
          <h3 className="text-xl font-bold">{currentSlide.title}</h3>
        </div>

        <div className="p-6">
          {/* Simplified content - only showing markdown content */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center">
              <BookOpen className="h-4 w-4 mr-1" /> Slide Content
            </h4>
            <div className="bg-gray-50 rounded-lg p-6 prose prose-sm max-w-none">
              <ReactMarkdown>{currentSlide.slide_markdown}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Navigation buttons - Updated to always be black */}
        <div className="bg-gray-50 p-4 flex justify-between items-center border-t">
          <Button
            variant="default"
            onClick={goToPrevSlide}
            disabled={!currentSlide.prev_slide}
            className="flex items-center bg-black hover:bg-gray-800 text-white disabled:bg-gray-300"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <div className="text-gray-500 text-sm">
            Slide {currentSlide.position + 1} of {slidesData?.length || 0}
          </div>

          <Button
            variant="default"
            onClick={goToNextSlide}
            disabled={!currentSlide.next_slide}
            className="flex items-center bg-black hover:bg-gray-800 text-white disabled:bg-gray-300"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading course details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !course) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700 mb-4">{error || "Course not found or unable to load course details"}</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-gray-50 relative">
        <ScrollArea className="h-[calc(100vh-64px)]">
          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-12 sm:pt-16 pb-8">
            {/* Fullscreen button */}
            <FullscreenButton
              isFullScreen={isFullScreen}
              onToggle={toggleFullScreen}
            />

            {/* Header with back button */}
            <div className="flex items-center justify-between mb-8">
              <CourseHeader
                title={title}
                courseId={params.id}
              />

              {/* Auto-save status indicator */}
              <div className="flex items-center">
                {saveStatus === 'saving' && (
                  <div className="flex items-center text-amber-600 text-sm">
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving...
                  </div>
                )}

                {saveStatus === 'saved' && (
                  <div className="flex items-center text-emerald-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Saved {lastSavedTime && (
                      <span className="text-gray-500 ml-1">
                        {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-8 border border-gray-200 bg-white">
                <TabsTrigger value="general" className="flex-1 sm:flex-none py-2.5 px-4 data-[state=active]:text-emerald-600">
                  General Information
                </TabsTrigger>
                <TabsTrigger value="syllabus" className="flex-1 sm:flex-none py-2.5 px-4 data-[state=active]:text-emerald-600">
                  Course Syllabus
                </TabsTrigger>
                <TabsTrigger value="slides" className="flex-1 sm:flex-none py-2.5 px-4 data-[state=active]:text-emerald-600">
                  View All Slides
                </TabsTrigger>
              </TabsList>

              {/* General Information Tab */}
              <TabsContent value="general" className="mt-0">
                <GeneralInfoTab
                  title={title}
                  setTitle={setTitle}
                  instructor={instructor}
                  setInstructor={setInstructor}
                  description={description}
                  setDescription={setDescription}
                  aiVoice={aiVoice}
                  setAiVoice={setAiVoice}
                  files={files}
                  setFiles={setFiles}
                  courseId={params.id}
                />
              </TabsContent>

              {/* Syllabus Tab */}
              <TabsContent value="syllabus" className="mt-0">
                <SyllabusTab
                  syllabus={course.syllabus}
                  onSyllabusChange={(syllabus) => setCourse(prev => prev ? { ...prev, syllabus } : null)}
                  slides={course.slides}
                  onPreviewSlide={handlePreviewSlide}
                  courseId={params.id}
                />
              </TabsContent>

              {/* Slides Tab */}
              <TabsContent value="slides" className="mt-0">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
                    <h2 className="text-2xl font-semibold">Course Slides</h2>

                    {/* Filtering options */}
                    {slidesData && slidesData.length > 0 && (
                      <div className="mt-4 md:mt-0 flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Filter by section:</span>
                        <select
                          className="bg-white border border-gray-300 text-gray-700 rounded px-3 py-1.5 text-sm"
                          value={filteredSection === null ? 'all' : filteredSection}
                          onChange={(e) => filterSlidesBySection(e.target.value === 'all' ? null : Number(e.target.value))}
                        >
                          <option value="all">All Sections</option>
                          {getUniqueSections().map(section => (
                            <option key={section.id} value={section.id}>{section.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {isLoadingSlides && (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                      <span className="ml-2 text-lg">Loading slides...</span>
                    </div>
                  )}

                  {slidesError && !isLoadingSlides && (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
                        <AlertCircle className="h-5 w-5 inline mr-2" />
                        {slidesError}
                      </div>

                      {/* Retry button */}
                      <Button
                        onClick={handleRetryFetchSlides}
                        variant="outline"
                        className="mt-2"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Retry Loading Slides
                      </Button>

                      {/* Guidance message */}
                      {slidesError.includes("not found") && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 mt-4">
                          <Info className="h-5 w-5 inline mr-2" />
                          Slides haven't been generated yet. To generate slides, go to the Create Course workflow and complete the process.
                        </div>
                      )}
                    </div>
                  )}

                  {slidesData && !isLoadingSlides && (
                    <>
                      {/* Current slide detail view */}
                      {viewMode === 'detail' && renderSlideContent()}

                      {/* Grid view of all slides - improved layout */}
                      <div className="space-y-6">
                        {viewMode === 'grid' && (
                          <>
                            <p className="text-gray-500">
                              Found {getDisplayedSlides().length} slide{getDisplayedSlides().length !== 1 ? 's' : ''}
                              {filteredSection !== null ? ' in this section' : ''}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {getDisplayedSlides().map((slide) => (
                                <Card
                                  key={slide.id}
                                  className="hover:shadow-md transition cursor-pointer h-full flex flex-col"
                                  onClick={() => navigateToSlide(slide.id)}
                                >
                                  <CardHeader className="pb-2 flex-shrink-0">
                                    <div className="flex justify-between items-start">
                                      <CardTitle className="text-lg font-medium line-clamp-2">{slide.title}</CardTitle>
                                      <Badge variant="outline" className="text-xs whitespace-nowrap ml-2">
                                        {slide.position + 1}/{slidesData.length}
                                      </Badge>
                                    </div>
                                    <CardDescription className="text-xs mt-1">
                                      {slide.section_title} ⟩ {slide.subtopic_title}
                                    </CardDescription>
                                  </CardHeader>

                                  <CardContent className="py-2 flex-grow">
                                    <div className="text-sm text-gray-600 line-clamp-4">
                                      {slide.slide_markdown.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '')}
                                    </div>
                                  </CardContent>

                                  <CardFooter className="py-2 border-t flex-shrink-0">
                                    <Button size="sm" variant="ghost" className="w-full text-emerald-600 hover:text-emerald-800">
                                      View Full Content
                                    </Button>
                                  </CardFooter>
                                </Card>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Slide Preview Modal */}
            <SlidePreviewModal
              slides={previewSlides}
              isOpen={isPreviewModalOpen}
              onClose={() => setIsPreviewModalOpen(false)}
              initialSlideId={initialSlideId}
            />
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}
