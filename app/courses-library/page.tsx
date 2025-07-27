"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { CourseCard, CourseItem } from "@/components/courses-library/CourseCard"
import { SortingTabs, SortOption } from "@/components/courses-library/SortingTabs"
import { Filters, LibraryFilters } from "@/components/courses-library/filter/Filters"
import { Button } from "@/components/ui/button"
import { Loader2, BookOpen, LibraryBig } from "lucide-react"
import { CourseCardGallery } from "@/components/courses-library/CourseCardGallery"
import { ViewToggle, ViewMode } from "@/components/courses-library/ViewToggle"

// Mock course data
const mockCourses: CourseItem[] = [
  {
    id: 1,
    title: "Introduction to Machine Learning with Python",
    description: "Learn the fundamentals of machine learning using Python and popular libraries like scikit-learn and TensorFlow.",
    author: "Dr. Alan Johnson",
    duration: 12,
    tags: ["Python", "Machine Learning", "AI", "Data Science"],
    views: 45600,
    publishedDate: "2023-06-15"
  },
  {
    id: 2,
    title: "Advanced Neural Networks and Deep Learning",
    description: "Dive deep into the theory and implementation of neural networks, CNNs, RNNs, and transformers.",
    author: "Prof. Sarah Chen",
    duration: 15,
    tags: ["Deep Learning", "Neural Networks", "Python", "TensorFlow"],
    views: 38200,
    publishedDate: "2023-04-20"
  },
  {
    id: 3,
    title: "Python for Data Analysis and Visualization",
    description: "Master data manipulation, analysis, and visualization using pandas, NumPy, and matplotlib.",
    author: "Jane Smith",
    duration: 8,
    tags: ["Python", "Data Analysis", "Visualization", "pandas"],
    views: 62100,
    publishedDate: "2023-07-05"
  },
  {
    id: 4,
    title: "Getting Started with TensorFlow",
    description: "A beginner-friendly tutorial on using TensorFlow for machine learning projects.",
    author: "TensorFlow Team",
    duration: 2,
    tags: ["TensorFlow", "Machine Learning", "Tutorial"],
    views: 89400,
    publishedDate: "2023-01-12"
  },
  {
    id: 5,
    title: "Natural Language Processing Fundamentals",
    description: "Learn key NLP concepts and techniques for text analysis, sentiment analysis, and more.",
    author: "Dr. Michael Brown",
    duration: 10,
    tags: ["NLP", "Machine Learning", "Python", "Text Analysis"],
    views: 33800,
    publishedDate: "2023-05-22"
  },
  {
    id: 6,
    title: "The Future of AI: Trends and Applications",
    description: "An in-depth article exploring emerging AI technologies and their real-world applications.",
    author: "AI Research Group",
    tags: ["AI", "Future Tech", "Research", "Applications"],
    views: 21500,
    publishedDate: "2023-09-01"
  },
  {
    id: 7,
    title: "Building Recommender Systems with Python",
    description: "A comprehensive guide to creating content-based and collaborative filtering recommendation systems.",
    author: "Tech Academy",
    duration: 3,
    tags: ["Recommender Systems", "Python", "Machine Learning"],
    views: 17200,
    publishedDate: "2023-08-18"
  },
  {
    id: 8, 
    title: "Introduction to Computer Vision with OpenCV",
    description: "Learn the basics of computer vision and image processing using the OpenCV library.",
    author: "Dr. Lisa Wang",
    duration: 8,
    tags: ["Computer Vision", "OpenCV", "Python", "Image Processing"],
    views: 42900,
    publishedDate: "2023-03-10"
  },
  {
    id: 9,
    title: "Reinforcement Learning: Theory and Practice",
    description: "An advanced course on RL algorithms, environments, and applications.",
    author: "Prof. David Miller",
    duration: 14,
    tags: ["Reinforcement Learning", "AI", "Python", "Algorithms"],
    views: 28600,
    publishedDate: "2023-02-14"
  },
  {
    id: 10,
    title: "Ethics in Artificial Intelligence",
    description: "Explore the ethical implications of AI technology and responsible development practices.",
    author: "Ethics in Tech Institute",
    tags: ["AI Ethics", "Technology", "Society", "Responsible AI"],
    views: 35700,
    publishedDate: "2023-07-29"
  },
  {
    id: 11,
    title: "Web Development with React and Next.js",
    description: "Build modern, responsive web applications using React and Next.js frameworks.",
    author: "Frontend Masters",
    duration: 16,
    tags: ["React", "Next.js", "Web Development", "JavaScript"],
    views: 76500,
    publishedDate: "2023-05-08"
  },
  {
    id: 12,
    title: "Blockchain Fundamentals and Applications",
    description: "Understand blockchain technology and explore practical applications in various industries.",
    author: "Blockchain Academy",
    duration: 12,
    tags: ["Blockchain", "Cryptocurrency", "Smart Contracts", "Web3"],
    views: 48900,
    publishedDate: "2023-06-22"
  }
];

// Function to get filtered and sorted courses
const getFilteredCourses = (
  courses: CourseItem[],
  filters: LibraryFilters,
  sortBy: SortOption
): CourseItem[] => {
  // Apply filters
  let filtered = [...courses];
  
  // Filter by tags
  if (filters.tags.length > 0) {
    filtered = filtered.filter(item => 
      item.tags && item.tags.some((tag: string) => filters.tags.includes(tag))
    );
  }

  // Filter by universities
  if (filters.universities && filters.universities.length > 0) {
    filtered = filtered.filter(item => 
      item.tags && item.tags.some((tag: string) => filters.universities!.includes(tag))
    );
  }
  
  // Filter by date range
  if (filters.dateRange && filters.dateRange.from) {
    const fromDate = new Date(filters.dateRange.from);
    const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : new Date();
    
    filtered = filtered.filter(item => {
      if (!item.publishedDate) return false;
      const publishedDate = new Date(item.publishedDate);
      return publishedDate >= fromDate && publishedDate <= toDate;
    });
  }
  
  // Sort results
  return filtered.sort((a, b) => {
    switch (sortBy) {
      case 'relevant':
        // For demo purposes, we'll use views
        return (b.views || 0) - (a.views || 0);
      
      case 'newest':
        return new Date(b.publishedDate || '').getTime() - new Date(a.publishedDate || '').getTime();
      
      case 'views':
        return (b.views || 0) - (a.views || 0);
      
      default:
        return 0;
    }
  });
};

export default function CoursesLibraryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevant');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [filters, setFilters] = useState<LibraryFilters>({
    tags: [],
    universities: []
  });
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [visibleCourses, setVisibleCourses] = useState<CourseItem[]>([]);
  const [page, setPage] = useState(1);
  const coursesPerPage = 8;
  
  // Function to handle sorting changes
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setPage(1);
  };
  
  // Function to handle filter changes
  const handleFilterChange = (newFilters: LibraryFilters) => {
    setFilters(newFilters);
    setPage(1);
  };
  
  // Function to handle view mode changes
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
  };
  
  // Function to load more courses
  const loadMore = () => {
    setPage(prev => prev + 1);
  };
  
  // Function to toggle fullscreen
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
  
  // Initial data loading
  useEffect(() => {
    // Simulate API fetch
    const loadCourses = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCourses(mockCourses);
      setIsLoading(false);
    };
    
    loadCourses();
  }, []);
  
  // Apply filters and sorting when they change
  useEffect(() => {
    if (courses.length > 0) {
      const filteredAndSorted = getFilteredCourses(courses, filters, sortBy);
      setVisibleCourses(filteredAndSorted.slice(0, page * coursesPerPage));
    }
  }, [courses, filters, sortBy, page]);
  
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
        <ScrollArea className="h-screen" type="hover">
          {/* Fullscreen button */}
          <FullscreenButton 
            isFullScreen={isFullScreen} 
            onToggle={toggleFullScreen} 
          />
          
          {/* Main content */}
          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 py-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Main content area */}
              <div className="flex-grow order-2 md:order-1">
                {/* Sorting tabs and view toggle in one line */}
                <div className="flex justify-between items-center mb-6">
                  <SortingTabs onSort={handleSortChange} activeSort={sortBy} />
                  <ViewToggle activeView={viewMode} onViewChange={handleViewChange} />
                </div>
                
                {/* Results */}
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                  </div>
                ) : visibleCourses.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No courses found</h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your filters to find courses that match your interests.
                    </p>
                    <Button 
                      onClick={() => {
                        setFilters({
                          tags: [],
                          universities: []
                        });
                      }}
                      variant="outline"
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      Clear all filters
                    </Button>
                  </div>
                ) : viewMode === 'list' ? (
                  // List view
                  <>
                    <div className="space-y-4">
                      {visibleCourses.map((course) => (
                        <CourseCard key={course.id} item={course} />
                      ))}
                    </div>
                    
                    {/* Load more button */}
                    {visibleCourses.length < getFilteredCourses(courses, filters, sortBy).length && (
                      <div className="mt-8 flex justify-center">
                        <Button 
                          variant="outline" 
                          className="min-w-[150px] text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={loadMore}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  // Gallery view
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleCourses.map((course) => (
                        <CourseCardGallery key={course.id} item={course} />
                      ))}
                    </div>
                    
                    {/* Load more button */}
                    {visibleCourses.length < getFilteredCourses(courses, filters, sortBy).length && (
                      <div className="mt-8 flex justify-center">
                        <Button 
                          variant="outline" 
                          className="min-w-[150px] text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={loadMore}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Filters sidebar - right side */}
              <div className="md:w-72 order-1 md:order-2 flex-shrink-0">
                <Filters 
                  onFilterChange={handleFilterChange}
                  initialFilters={filters}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
} 