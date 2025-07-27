"use client";

import { useRouter } from "next/navigation";
import { BookOpen, PlusCircle, ChevronRight } from "lucide-react";
import { HeaderOnlyLayout } from "@/components/layout/HeaderOnlyLayout";
import { PublishSidebar } from "@/components/my-publish/publish-page-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

export default function PublishDetailsPage() {
  const router = useRouter();

  const handleExistingCoursesClick = () => {
    router.push("/my-publish/publish-details/publish-from-existing-courses");
  };

  const handleCreateCourseClick = () => {
    // For now, no redirection - will be implemented later
    console.log("Create new course clicked");
  };

  return (
    <HeaderOnlyLayout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <PublishSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-white">
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-12 sm:pt-16 pb-16">
              <div className="mb-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Publish Content</h1>
                <p className="text-sm text-gray-500 max-w-2xl">Choose how you want to publish your AI courses online. We support multiple publication methods to fit your needs.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                {/* Option 1: Publish from existing courses - Fancy Design */}
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleExistingCoursesClick}
                  className="relative cursor-pointer group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                  <div className="relative bg-white border border-blue-100 rounded-2xl p-8 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <BookOpen className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <div className="flex-grow">
                        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          Publish from Existing Courses
                        </h2>
                        <p className="text-sm text-gray-600 mb-4 mt-2">
                          Already have courses created? You can select from your existing courses and publish to the platform. This is perfect for repurposing your best material.
                        </p>
                        <div className="flex items-center text-blue-600 font-medium text-sm">
                          Browse your courses
                          <ChevronRight className="h-5 w-5 ml-1 group-hover:ml-2 transition-all" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-50 rounded-tl-[100px] -mb-16 -mr-16 z-0 opacity-60"></div>
                    </div>
                  </div>
                </motion.div>

                {/* Option 2: Create new course - Fancy Design */}
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleCreateCourseClick}
                  className="relative cursor-pointer group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                  <div className="relative bg-white border border-emerald-100 rounded-2xl p-8 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <PlusCircle className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <div className="flex-grow">
                        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          Create a New Course
                        </h2>
                        <p className="text-sm text-gray-600 mb-4 mt-2">
                          Are you a teacher looking to create fresh content? Get started with our intuitive course creation tools. Build engaging lessons, add interactive elements, and publish with ease.
                        </p>
                        <div className="flex items-center text-emerald-600 font-medium text-sm">
                          Start creating
                          <ChevronRight className="h-5 w-5 ml-1 group-hover:ml-2 transition-all" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-50 rounded-tl-[100px] -mb-16 -mr-16 z-0 opacity-60"></div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </HeaderOnlyLayout>
  );
}
