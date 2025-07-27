"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MyCoursesHeader } from "@/components/my-courses/my-courses-section-header"
import { CourseCard } from "@/components/my-courses/CourseCard"
import { LoadingCourseCard } from "@/components/my-courses/LoadingCourseCard"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { CreateCourseCard } from "@/components/my-courses/create-course-card"
import { StatusMessage, StatusType } from "@/components/ui/status-message"
import { requestAssistant } from "@/components/my-courses/utils/vapi-api-endpoints"
import { fetchCoursesAndDrafts } from "@/components/my-courses/utils/course-api-endpoints"
import { useAuth } from "@/auth/firebase"
import { useRouter } from "next/navigation"

interface CourseData {
  id: string;
  title: string;
  progress: number;
  hoursCompleted: number;
  author: string;
  nextSection?: string;
  isDraft: boolean;
  createdAt?: string;
}

export default function CoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [courses, setCourses] = useState<CourseData[]>([])
  const [drafts, setDrafts] = useState<CourseData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assistantRequests, setAssistantRequests] = useState<Record<string, boolean>>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<StatusType>('info')
  const [creatingCourse, setCreatingCourse] = useState<{ title: string, timestamp: number } | null>(null)

  // Fetch courses from backend
  const loadCourses = async () => {
    if (authLoading) {
      return; // Wait for auth state to be determined
    }

    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setIsLoading(true);
      const idToken = await user.getIdToken();
      const coursesData = await fetchCoursesAndDrafts(idToken);
      setCourses(coursesData.courses);
      setDrafts(coursesData.drafts);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load of courses
  useEffect(() => {
    loadCourses();
  }, [user, authLoading]);

  // Function to request an assistant for a course
  const handleRequestAssistant = async (courseId: string, courseTitle: string): Promise<string | null> => {
    if (!user) {
      router.push('/login');
      return null;
    }

    // Mark this course as having a pending assistant request
    setAssistantRequests(prev => ({ ...prev, [courseId]: true }));

    try {
      // Show status message
      setStatusMessage("Preparing your AI assistant...");
      setStatusType('info');
      console.log("Preparing AI assistant for course:", courseTitle);

      const idToken = await user.getIdToken();
      // Request assistant from backend
      const assistantId = await requestAssistant(courseId, courseTitle, idToken);

      if (!assistantId) {
        throw new Error('Failed to create assistant');
      }

      // Clear status message
      setStatusMessage(null);

      // Return the assistant ID
      return assistantId;
    } catch (error) {
      console.error('Error creating assistant:', error);
      setStatusMessage("Failed to create AI assistant. You can still access the course.");
      setStatusType('error');
      return null;
    } finally {
      // Clear the pending state
      setAssistantRequests(prev => ({ ...prev, [courseId]: false }));
    }
  };

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

  // Show loading state while auth is being determined
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex-1 bg-gray-50 relative">
          <div className="flex justify-center items-center h-[calc(100vh-64px)]">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-gray-50 relative">
        {/* Status message display */}
        <StatusMessage
          message={statusMessage}
          type={statusType}
          duration={5000}
          onClose={() => setStatusMessage(null)}
        />

        <ScrollArea className="h-[calc(100vh-64px)]" type="hover">
          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-12 sm:pt-16 pb-8">
            <div className="flex justify-between items-center mb-3">
              <MyCoursesHeader
                title="My Courses"
                description="Continue learning your enrolled courses"
              />
              <FullscreenButton
                isFullScreen={isFullScreen}
                onToggle={toggleFullScreen}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading courses...</p>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-red-500">Error: {error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                <CreateCourseCard />
                {creatingCourse && (
                  <LoadingCourseCard 
                    courseTitle={creatingCourse.title} 
                    initialProgress={20} 
                  />
                )}
                {drafts.map((draft) => (
                  <CourseCard
                    key={draft.id}
                    course={{...draft, isDraft: true}}
                  />
                ))}
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={{...course, isDraft: false}}
                    onRequestAssistant={handleRequestAssistant}
                  />
                ))}
                { !creatingCourse && drafts.length === 0 && courses.length === 0 && (
                   <div className="col-span-full flex justify-center items-center h-40">
                      <p className="text-gray-500">You haven't created any courses yet.</p>
                   </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}

