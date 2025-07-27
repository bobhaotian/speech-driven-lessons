"use client"

import { HeaderOnlyLayout } from "@/components/layout/HeaderOnlyLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Edit, Trash2, Eye, BookOpen, BarChart } from "lucide-react"
import { PublishSidebar } from "@/components/my-publish/publish-page-sidebar"

// Sample course data with added topics
const courses = [
  {
    id: 1,
    title: "Introduction to AI",
    students: 2845,
    author: "John Doe",
    createdAt: "2024-01-15",
    tags: ["AI", "Machine Learning", "Artificial Intelligence"]
  },
  {
    id: 2,
    title: "Machine Learning Fundamentals",
    students: 1256,
    author: "Jane Smith",
    createdAt: "2024-02-20",
    tags: ["Machine Learning", "Data Science", "Artificial Intelligence"]
  },
  {
    id: 3,
    title: "Deep Learning with Python",
    students: 987,
    author: "David Johnson",
    createdAt: "2024-03-10",
    tags: ["Deep Learning", "Python", "Artificial Intelligence"]
  },
  {
    id: 4,
    title: "Neural Networks and Applications",
    students: 1532,
    author: "Emily Wilson",
    createdAt: "2024-04-05",
    tags: ["Neural Networks", "Computer Science", "Artificial Intelligence"]
  }
]

export default function MyChannelPage() {
  // Function to get initials from title
  const getInitials = (title: string): string => {
    return title
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  // Function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Function to handle tags display (show max 2 tags + count for others)
  const renderTags = (tags: string[]) => {
    if (tags.length <= 2) {
      return tags.map((tag, idx) => (
        <span key={idx} className="text-xs py-0.5 px-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-md">
          {tag}
        </span>
      ));
    } else {
      return (
        <>
          {tags.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="text-xs py-0.5 px-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-md">
              {tag}
            </span>
          ))}
          <span className="text-xs py-0.5 px-2 bg-gray-100 text-gray-600 rounded-md font-medium">
            +{tags.length - 2} more
          </span>
        </>
      );
    }
  };
  
  return (
    <HeaderOnlyLayout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <PublishSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 bg-white">
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-12 sm:pt-16 pb-16">
              {/* Search and Filter Row */}
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">My Channel</h1>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input 
                    placeholder="Search for content..." 
                    className="pl-10 border border-gray-200 focus:border-gray-300 bg-gray-50 h-10 pr-10"
                  />
                </div>
              </div>
              
              {/* Course List */}
              <div className="space-y-6">
                {courses.map(course => (
                  <div key={course.id} className="border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200 bg-white hover:border-gray-300 group overflow-hidden">
                    <div className="flex">
                      {/* Thumbnail (full height) */}
                      <div className="w-48 bg-gray-800 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-white opacity-70" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        {/* Title and date */}
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors mb-2">{course.title}</h3>
                            <span className="text-xs text-gray-500 ml-2">{formatDate(course.createdAt)}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {renderTags(course.tags)}
                          </div>
                        </div>
                        
                        {/* Stats and actions */}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4 text-gray-400" />
                              <span>{course.students}</span>
                            </div>
                            <div>|</div>
                            <div>
                              <span className="text-gray-600">{course.author}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-600 hover:text-emerald-600">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-600 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </HeaderOnlyLayout>
  )
} 