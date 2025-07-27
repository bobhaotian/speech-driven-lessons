"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CourseCard } from "@/components/my-courses/CourseCard"
import { SectionHeader } from "@/components/dashboard/dashboard-section-header"
import { TutorialCard } from "@/components/dashboard/tutorial-card"
import { FeaturedRecommendationCard } from "@/components/dashboard/featured-recommendation-card"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { useRouter } from "next/navigation"
import { RecommendedCourseCard, RecommendedCoursesSearch } from "@/components/dashboard/recommended-course-card"
import { CourseInfo } from "@/components/my-courses/utils/courseTypes"

// Types
interface Course {
  id: string;
  title: string;
  progress: number;
  duration?: number;
  hoursCompleted?: number;
  image?: string;
}

interface Tutorial {
  id: number;
  title: string;
  image: string;
  videoUrl: string;
}

// This needs to match the interface in featured-recommendation-card.tsx
interface FeaturedRecommendation {
  id: number;
  title: string;
  description: string;
  image: string;
  duration: number;
  match: number;
}

// API functions for future implementation
const fetchEnrolledCourses = async (): Promise<Course[]> => {
  // This will be replaced with an actual API call in the future
  // Example: const response = await fetch('/api/user/courses');
  //          return await response.json();
  
  // Mock data
  const mockCourses = [
    {
      id: "1",
      title: "Introduction to AI",
      progress: 75,
      hoursCompleted: 7.5,
      duration: 10
    },
    {
      id: "2",
      title: "Machine Learning Fundamentals",
      progress: 45,
      hoursCompleted: 4.5,
      duration: 8
    },
    {
      id: "3",
      title: "Deep Learning with Python",
      progress: 20,
      hoursCompleted: 2,
      duration: 5
    },
    {
      id: "4",
      title: "Advanced Python for Data Science",
      progress: 60,
      hoursCompleted: 6,
      duration: 8
    }
  ];
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockCourses;
};

const fetchRecommendedCourses = async (): Promise<Course[]> => {
  // Mock data
  const mockRecommendations = [
    {
      id: "4",
      title: "Natural Language Processing",
      duration: 12,
      progress: 0
    },
    {
      id: "5",
      title: "Computer Vision Basics",
      duration: 8,
      progress: 0
    },
    {
      id: "6",
      title: "AI Ethics and Governance",
      duration: 6,
      progress: 0
    },
    {
      id: "7",
      title: "Reinforcement Learning",
      duration: 10,
      progress: 0
    }
  ];
  
  await new Promise(resolve => setTimeout(resolve, 700));
  return mockRecommendations;
};

const fetchTutorials = async (): Promise<Tutorial[]> => {
  // Mock data
  const mockTutorials = [
    {
      id: 1,
      title: "How to Use AI Tutor for Personalized Learning",
      image: "/placeholder.svg?height=400&width=600&text=AI+Tutor+Guide",
      videoUrl: "https://www.youtube.com/embed/oYNzl4Hzi4M",
    },
    {
      id: 2,
      title: "Maximizing Your Learning with AI-Powered Courses",
      image: "/placeholder.svg?height=400&width=600&text=Maximize+Learning",
      videoUrl: "https://www.youtube.com/embed/TnpcBrxEQmU",
    },
  ];
  
  await new Promise(resolve => setTimeout(resolve, 600));
  return mockTutorials;
};

const fetchFeaturedRecommendations = async (): Promise<FeaturedRecommendation[]> => {
  // Mock data
  const mockFeatured = [
    {
      id: 1,
      title: "Neural Networks Fundamentals",
      description: "Learn the core concepts of neural networks and deep learning",
      image: "/placeholder.svg?height=200&width=300&text=Neural+Networks",
      duration: 8,
      match: 98
    },
    {
      id: 2,
      title: "Advanced Data Structures",
      description: "Master complex data structures for efficient programming",
      image: "/placeholder.svg?height=200&width=300&text=Data+Structures", 
      duration: 12,
      match: 95
    },
    {
      id: 3,
      title: "Machine Learning with Python",
      description: "Practical machine learning techniques using Python",
      image: "/placeholder.svg?height=200&width=300&text=ML+Python",
      duration: 10,
      match: 92
    }
  ];
  
  await new Promise(resolve => setTimeout(resolve, 800));
  return mockFeatured;
};

export default function DashboardPage() {
  const router = useRouter();
  const tutorialsRef = useRef<HTMLElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [featuredRecommendations, setFeaturedRecommendations] = useState<FeaturedRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  
  // Fetch data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // In a real application, you might want to use Promise.all to fetch multiple resources in parallel
        const [courses, recommended, tutorialData, featuredData] = await Promise.all([
          fetchEnrolledCourses(),
          fetchRecommendedCourses(),
          fetchTutorials(),
          fetchFeaturedRecommendations()
        ]);
        
        setEnrolledCourses(courses);
        setRecommendedCourses(recommended);
        setTutorials(tutorialData);
        setFeaturedRecommendations(featuredData);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Function to navigate while preserving fullscreen state
  const navigateToMyUploads = () => {
    // Use Next.js router to navigate without exiting fullscreen
    router.push('/my-uploads');
  };

  // Function to scroll to tutorials section
  const scrollToTutorials = () => {
    tutorialsRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  // Handle assistant request for a course
  const handleRequestAssistant = async (courseId: string, courseTitle: string): Promise<string | null> => {
    try {
      console.log(`Requesting assistant for course: ${courseTitle} (ID: ${courseId})`);
      // In a real implementation, this would call an API to create or get an assistant
      // Mock delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      // Return a mock assistant ID
      return `assistant_${Date.now()}`;
    } catch (error) {
      console.error("Error creating assistant:", error);
      return null;
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 bg-gray-50 relative">
        <ScrollArea className="h-screen" type="hover">
          {/* Fullscreen button */}
          <FullscreenButton 
            isFullScreen={isFullScreen} 
            onToggle={toggleFullScreen} 
          />
          
          {/* Welcome Banner */}
          <div className="w-full bg-gradient-to-r from-slate-200 to-slate-300 mb-6">
            <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 py-8 sm:py-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col justify-center">
                  <h1 className="text-3xl font-bold text-emerald-800">
                    Welcome back, User!
                  </h1>
                  <p className="mt-2 text-lg text-emerald-700">
                    Track your learning progress and continue your courses.
                  </p>
                  
                  <div className="mt-4 flex flex-wrap gap-4">
                    <Button 
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-3 rounded-md"
                      onClick={navigateToMyUploads}
                    >
                      Customize your courses
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-2 border-emerald-800 text-emerald-800 bg-transparent hover:bg-emerald-50 font-medium px-6 py-3 rounded-md"
                      onClick={scrollToTutorials}
                    >
                      More details
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-center h-full">
                  {isLoading ? (
                    <div className="w-full max-w-md h-[270px] animate-pulse bg-slate-300 rounded-xl"></div>
                  ) : (
                    <div className="w-full max-w-md h-[270px]">
                      <FeaturedRecommendationCard recommendations={featuredRecommendations} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-4 sm:pt-6 pb-8">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 mb-12">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {/* Continue Learning Section */}
                <section className="mb-12">
                  <SectionHeader 
                    title="Continue Learning" 
                    description="Your enrolled courses and learning progress" 
                    actionHref="/in-class-courses"
                  />
                  
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mt-4">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="h-60 animate-pulse bg-gray-100 border-gray-100" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mt-4">
                      {enrolledCourses.map((course) => (
                        <CourseCard 
                          key={course.id}
                          course={{
                            id: course.id,
                            title: course.title,
                            progress: { 
                              completion: course.progress, 
                              hours: course.hoursCompleted || course.duration || 0
                            },
                            author: "Instructor Name",
                            description: null,
                            created_at: new Date().toISOString(),
                            last_updated_at: new Date().toISOString(),
                            create_course_process: {
                              is_creation_complete: true,
                              current_step: 5
                            },
                            uploadedFiles: [],
                            ai_voice: "jennifer"
                          } as CourseInfo} 
                          onRequestAssistant={handleRequestAssistant}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Recommended Courses Section */}
                <section className="mb-12">
                  <SectionHeader 
                    title="Recommended For You" 
                    description="Courses that match your interests and goals"
                    actionHref="/my-courses/recommended"
                    actionText="View All Recommendations"
                  />
                  
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mt-4">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="h-36 animate-pulse bg-gray-100 border-gray-100" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mt-4">
                      {recommendedCourses.slice(0, 3).map((course) => (
                        <RecommendedCourseCard
                          key={course.id}
                          id={course.id}
                          title={course.title}
                          duration={course.duration}
                          onClick={() => router.push(`/in-class-courses/${course.id}`)}
                        />
                      ))}
                      <RecommendedCoursesSearch />
                    </div>
                  )}
                </section>

                {/* Tutorials Section */}
                <section ref={tutorialsRef} className="mb-8">
                  <SectionHeader 
                    title="Helpful Tutorials" 
                    description="Learn how to get the most out of Tutorion" 
                    actionText="Browse all tutorials"
                    actionHref="/tutorials"
                  />
                  
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      {[...Array(2)].map((_, i) => (
                        <Card key={i} className="aspect-video animate-pulse bg-gray-100 border-gray-100" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      {tutorials.map((tutorial) => (
                        <TutorialCard key={tutorial.id} tutorial={tutorial} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}

