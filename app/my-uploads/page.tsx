"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CustomizeCourseModal } from "@/components/my-uploads/create-course-modal-v2"
import { MyCoursesHeader } from "@/components/my-uploads/my-courses-section-header"
import { CourseCard } from "@/components/my-uploads/CourseCard"
import { FullscreenButton } from "@/components/layout/fullscreen-button"

// Sample courses data without course codes
// TODO: Replace with API call to fetch courses
// This is temporary mock data that will be replaced with actual data from the backend
const courses = [
  {
    id: 1,
    title: "Introduction to AI",
    hoursCompleted: 7.5,
    enrolled: 485,
    views: 1250,
    isPublished: true
  },
  {
    id: 2,
    title: "Machine Learning Fundamentals",
    hoursCompleted: 4.5,
    enrolled: 320,
    views: 890,
    isPublished: true
  },
  {
    id: 3,
    title: "Deep Learning with Python",
    hoursCompleted: 2,
    enrolled: 156,
    views: 430,
    isPublished: false
  },
  {
    id: 4,
    title: "Natural Language Processing and Contextual Understanding in Modern Applications",
    hoursCompleted: 6,
    enrolled: 278,
    views: 615,
    isPublished: true
  },
  {
    id: 5,
    title: "CV",  // Very short title to test that case
    hoursCompleted: 3,
    enrolled: 92,
    views: 205,
    isPublished: false
  },
  {
    id: 6,
    title: "Frontend Development with React and TypeScript",
    hoursCompleted: 5,
    enrolled: 347,
    views: 780,
    isPublished: false
  }
]

export default function CoursesPage() {
  const [isFullScreen, setIsFullScreen] = useState(false)
  // TODO: Add state for courses
  // const [courses, setCourses] = useState([])
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState(null)

  // TODO: API endpoint - Fetch courses from backend
  // useEffect(() => {
  //   async function fetchCourses() {
  //     try {
  //       setIsLoading(true);
  //       // const response = await fetch('/api/courses');
  //       // if (!response.ok) throw new Error('Failed to fetch courses');
  //       // const data = await response.json();
  //       // setCourses(data);
  //     } catch (error) {
  //       // setError(error.message);
  //       console.error('Error fetching courses:', error);
  //     } finally {
  //       // setIsLoading(false);
  //     }
  //   }
  //   fetchCourses();
  // }, []);

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

  return (
    <MainLayout>
      <div className="flex-1 bg-gray-50 relative">
        <ScrollArea className="h-[calc(100vh-64px)]" type="hover">
          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-16 sm:pt-20 pb-8">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <MyCoursesHeader
                  title="My Uploads"
                  description="Customize and upload your own courses"
                />
              </div>
              <div className="pt-2">
                <FullscreenButton
                  isFullScreen={isFullScreen}
                  onToggle={toggleFullScreen}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-6">
              <CustomizeCourseModal />
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}

