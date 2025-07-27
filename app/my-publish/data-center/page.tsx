"use client"

import { HeaderOnlyLayout } from "@/components/layout/HeaderOnlyLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PublishSidebar } from "@/components/my-publish/publish-page-sidebar"
import { BarChart, LineChart, PieChart } from "lucide-react"

export default function DataCenterPage() {
  return (
    <HeaderOnlyLayout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <PublishSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 bg-white">
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-12 sm:pt-16 pb-16">
              {/* Page Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Data Center</h1>
                <p className="text-gray-500 mt-2">Analytics and insights for your content</p>
              </div>
              
              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Total Views</h3>
                    <BarChart className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">6,620</p>
                  <p className="text-sm text-green-600 mt-2">↑ 12% from last month</p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Watch Time</h3>
                    <LineChart className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">248 hrs</p>
                  <p className="text-sm text-green-600 mt-2">↑ 8% from last month</p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Audience</h3>
                    <PieChart className="h-5 w-5 text-orange-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">824</p>
                  <p className="text-sm text-green-600 mt-2">↑ 15% from last month</p>
                </div>
              </div>
              
              {/* Charts Placeholder */}
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Views Over Time</h3>
                  <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart visualization would go here</p>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Popular Content</h3>
                  <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart visualization would go here</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </HeaderOnlyLayout>
  )
} 