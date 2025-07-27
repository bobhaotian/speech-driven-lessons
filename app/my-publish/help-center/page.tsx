"use client"

import { HeaderOnlyLayout } from "@/components/layout/HeaderOnlyLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PublishSidebar } from "@/components/my-publish/publish-page-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, MessageCircle, PlayCircle, ChevronRight, HelpCircle } from "lucide-react"

export default function HelpCenterPage() {
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
              <div className="mb-8 text-center max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Help Center</h1>
                <p className="text-gray-500 mb-6">Find answers to your questions and learn how to get the most out of your creator experience</p>
                
                {/* Search Bar */}
                <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input 
                    placeholder="Search for help articles..." 
                    className="pl-10 border border-gray-200 focus:border-gray-300 bg-gray-50 h-12 pr-10 text-base"
                  />
                  <Button className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10">
                    Search
                  </Button>
                </div>
              </div>
              
              {/* Help Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center hover:shadow-md transition-shadow">
                  <div className="bg-blue-100 rounded-full p-3 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Getting Started</h3>
                  <p className="text-gray-500 text-sm mb-4">Learn the basics of creating and publishing your content</p>
                  <Button variant="ghost" className="text-blue-600">
                    View Guides <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center hover:shadow-md transition-shadow">
                  <div className="bg-purple-100 rounded-full p-3 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                    <PlayCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Video Tutorials</h3>
                  <p className="text-gray-500 text-sm mb-4">Watch step-by-step tutorials for creating content</p>
                  <Button variant="ghost" className="text-purple-600">
                    Watch Videos <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center hover:shadow-md transition-shadow">
                  <div className="bg-green-100 rounded-full p-3 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Contact Support</h3>
                  <p className="text-gray-500 text-sm mb-4">Get help from our support team for specific issues</p>
                  <Button variant="ghost" className="text-green-600">
                    Get Help <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              
              {/* FAQ Section */}
              <div className="bg-gray-50 rounded-lg p-8 mb-12">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
                  <p className="text-gray-500">Quick answers to common questions</p>
                </div>
                
                <div className="space-y-4 max-w-3xl mx-auto">
                  {[
                    {
                      question: "How do I publish my first course?",
                      answer: "To publish your first course, go to the My Channel section, click on 'Create New Course', and follow the setup wizard to upload your content, set pricing, and publish."
                    },
                    {
                      question: "When will I receive payment for my sales?",
                      answer: "Payments are processed on the 1st of each month for the previous month's earnings, with a minimum payout threshold of $50. Funds typically arrive within 3-5 business days."
                    },
                    {
                      question: "How can I promote my courses?",
                      answer: "You can promote your courses through social media sharing, email marketing to your subscribers, collaborating with other creators, and utilizing our affiliate program."
                    },
                    {
                      question: "What file formats are supported for uploads?",
                      answer: "We support video uploads in MP4, MOV, and AVI formats with a maximum file size of 2GB per video. For documents, we support PDF, DOCX, and PPTX formats."
                    },
                  ].map((faq, index) => (
                    <div key={index} className="bg-white rounded-lg p-5 border border-gray-200">
                      <div className="flex items-start">
                        <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">{faq.question}</h4>
                          <p className="text-gray-600 text-sm">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mt-8">
                  <Button variant="outline">
                    View All FAQs <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              
              {/* Contact Card */}
              <div className="bg-blue-600 rounded-lg p-8 text-white text-center">
                <h2 className="text-xl font-bold mb-2">Still Need Help?</h2>
                <p className="mb-6 opacity-90">Our support team is ready to assist you with any questions</p>
                <div className="flex justify-center gap-4">
                  <Button className="bg-white text-blue-600 hover:bg-blue-50">
                    Contact Support
                  </Button>
                  <Button variant="outline" className="border-white text-white hover:bg-blue-700">
                    Submit a Request
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </HeaderOnlyLayout>
  )
} 