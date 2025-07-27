"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MainLayout } from "@/components/layout/MainLayout"
import { PageHeader } from "@/components/syllabus-editor/page-header"
import { SyllabusEditor } from "@/components/syllabus-editor/syllabus-editor"
import { ContentSettings } from "@/components/syllabus-editor/content-settings"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { generateSyllabus, generateSlides } from "@/components/create-syllabus/utils/api-endpoints"
import { parseMarkdownSyllabus, createFallbackSyllabus } from "@/components/create-syllabus/utils/syllabus-parser"
import { getAIResponse, initializeChatbot } from "@/components/create-syllabus/utils/api-endpoints"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { CourseData } from "@/components/my-courses/utils/files-management-endpoints"
import { storeNewCourseData, flagCourseBeingCreated, formatCourseForSubmission } from "@/components/my-courses/utils/course-api-endpoints"


export default function CreateCoursePage() {
  const router = useRouter()
  const [courseData, setCourseData] = useState<CourseData>({
    id: 0,
    title: "",
    aiVoice: "",
    files: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [textAmount, setTextAmount] = useState("medium")
  const [isClient, setIsClient] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isGeneratingSyllabus, setIsGeneratingSyllabus] = useState(false)
  const [youtubeLink, setYoutubeLink] = useState("")
  const [summary, setSummary] = useState("")
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [slidesGenerated, setSlidesGenerated] = useState(false)

  // Initialize syllabus with default items
  const [syllabus, setSyllabus] = useState([
    {
      id: "item1",
      content: "Introduction to Computer Science",
      subsyllabus: [
        { id: "sub1.1", content: "History of computing" },
        { id: "sub1.2", content: "Basic computer architecture" },
      ],
      isExpanded: false
    },
    {
      id: "item2",
      content: "Programming Fundamentals",
      subsyllabus: [
        { id: "sub2.1", content: "Variables and data types" },
        { id: "sub2.2", content: "Control structures and loops" },
        { id: "sub2.3", content: "Functions and procedures" },
      ],
      isExpanded: false
    },
    {
      id: "item3",
      content: "Data Structures and Algorithms",
      subsyllabus: [
        { id: "sub3.1", content: "Arrays and linked lists" },
        { id: "sub3.2", content: "Stacks, queues, and trees" },
        { id: "sub3.3", content: "Sorting and searching algorithms" },
      ],
      isExpanded: false
    },
    {
      id: "item4",
      content: "Object-Oriented Programming",
      subsyllabus: [
        { id: "sub4.1", content: "Classes and objects" },
        { id: "sub4.2", content: "Inheritance and polymorphism" },
        { id: "sub4.3", content: "Design patterns" },
      ],
      isExpanded: false
    },
    {
      id: "item5",
      content: "Web Development",
      subsyllabus: [
        { id: "sub5.1", content: "HTML, CSS, and JavaScript" },
        { id: "sub5.2", content: "Backend development with Node.js" },
        { id: "sub5.3", content: "Frontend frameworks (React, Vue, Angular)" },
      ],
      isExpanded: false
    },
    {
      id: "item6",
      content: "Databases",
      subsyllabus: [
        { id: "sub6.1", content: "Relational database concepts" },
        { id: "sub6.2", content: "SQL query language" },
        { id: "sub6.3", content: "NoSQL databases" },
      ],
      isExpanded: false
    },
    {
      id: "item7",
      content: "Software Engineering Practices",
      subsyllabus: [
        { id: "sub7.1", content: "Version control with Git" },
        { id: "sub7.2", content: "Agile development methodologies" },
        { id: "sub7.3", content: "Testing and debugging techniques" },
      ],
      isExpanded: false
    },
  ])

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

  // Load course data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('newCourseData')
    if (savedData) {
      setCourseData(JSON.parse(savedData))
    } else {
      // Redirect back if no data is found
      router.push('/my-courses')
    }

    // TODO: API endpoint - Fetch course data
    // async function fetchCourseData(courseId) {
    //   try {
    //     // const response = await fetch(`/api/courses/${courseId}`);
    //     // if (!response.ok) throw new Error('Failed to fetch course data');
    //     // const data = await response.json();
    //     // setCourseData(data);
    //     // setSyllabus(data.syllabus || defaultSyllabus);
    //     // setTextAmount(data.textAmount || "medium");
    //   } catch (error) {
    //     console.error('Error fetching course data:', error);
    //     router.push('/courses_v2');
    //   }
    // }
    // if (courseId) fetchCourseData(courseId);
  }, [router])

  // Add this useEffect to confirm we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Sample data for development - would be removed in production
  useEffect(() => {
    // This will override the localStorage data loading
    setCourseData({
      id: 1737432872466,
      title: "CS246 OOP Programming Course Study",
      aiVoice: "female1",
      files: [
        { id: "file1", name: "lecture_notes.pdf", size: "2.4 MB", type: "application/pdf" },
        { id: "file2", name: "programming_exercises.zip", size: "1.2 MB", type: "application/zip" },
        { id: "file3", name: "syllabus_overview.docx", size: "345 KB", type: "application/docx" }
      ]
    });
  }, []);

  // Handle course creation
  const handleCreateCourse = async () => {
    setIsLoading(true)

    // Save the updated course data using our helper function
    storeNewCourseData(courseData)

    // Flag that a course is being created (for the loading animation)
    flagCourseBeingCreated(courseData)

    try {
      // Format the course data for submission
      const formattedCourse = formatCourseForSubmission(courseData, syllabus, textAmount)

      // In a real implementation, this would call the API
      // const createdCourse = await createCourse(formattedCourse)

      // For now, simulate an API delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Navigate to mycourses page
      router.push('/my-courses')
    } catch (error) {
      console.error('Error creating course:', error)
      setIsLoading(false)
      // You could add error handling UI here
    }
  }

  // Handle syllabus generation
  const handleGenerateSyllabus = async () => {
    if (!courseData.id) {
      // Show error or notification if title is missing
      return
    }

    try {
      setIsGeneratingSyllabus(true)

      // Call the API function to generate syllabus
      const result = await generateSyllabus(courseData.id)

      if (result.success && result.materials.syllabus) {
        console.log("Raw syllabus:", result.materials.syllabus);

        // Check if the response is already an array with the expected structure
        if (Array.isArray(result.materials.syllabus)) {
          setSyllabus(result.materials.syllabus);
        }
        // Parse the markdown string into the expected structure
        else if (typeof result.materials.syllabus === 'string') {
          const parsedSyllabus = parseMarkdownSyllabus(result.materials.syllabus);
          console.log("Parsed syllabus:", parsedSyllabus);

          if (parsedSyllabus.length > 0) {
            setSyllabus(parsedSyllabus);
          } else {
            // Fallback if parsing didn't yield results
            setSyllabus(createFallbackSyllabus(result.materials.syllabus));
          }
        }
      }
    } catch (error) {
      console.error('Error generating syllabus:', error)
    } finally {
      setIsGeneratingSyllabus(false)
    }
  }

  // Handle YouTube summary generation
  const handleGenerateSummary = async () => {
    if (!youtubeLink) {
      // Show error or notification if link is missing
      return
    }

    try {
      setIsGeneratingSummary(true)

      // Initialize the chatbot first
      await initializeChatbot(courseData.title)

      // Format the request to ask for a YouTube video summary
      const prompt = `Please provide a summary of this YouTube video: ${youtubeLink}. Include the main points and key takeaways.`

      // Call the API function to get AI response
      const result = await getAIResponse(prompt, courseData.title)

      // Set the summary text
      setSummary(result.response || result.message || "No summary available")

    } catch (error) {
      console.error('Error generating summary:', error)
      setSummary("Failed to generate summary. Please try again.")
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Handle slides generation
  const handleGenerateSlides = async () => {
    if (!courseData.id) {
      // Show error or notification if title is missing
      return
    }

    try {
      setIsGeneratingSlides(true)

      // Call the API function to generate slides
      const result = await generateSlides(courseData.id)

      console.log("Slides generation result:", result)

      // Store the slides in localStorage for use in the slides page
      localStorage.setItem(`slides_${courseData.title}`, JSON.stringify(result))

      // Set flag that slides have been generated
      setSlidesGenerated(true)

      // No longer navigate immediately to the slides page

    } catch (error) {
      console.error('Error generating slides:', error)
    } finally {
      setIsGeneratingSlides(false)
    }
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-gray-50 relative">
        <ScrollArea className="h-[calc(100vh-64px)]" type="hover">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <PageHeader
                title={courseData.title}
                onBack={() => router.push('/my-courses')}
              />
              <FullscreenButton
                isFullScreen={isFullScreen}
                onToggle={toggleFullScreen}
              />
            </div>

            <div className="mb-6">
              <Button
                onClick={handleGenerateSyllabus}
                disabled={isGeneratingSyllabus}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGeneratingSyllabus ? (
                  <>
                    <span className="animate-spin mr-2">&#9696;</span>
                    Generating Syllabus...
                  </>
                ) : (
                  "Generate AI Syllabus"
                )}
              </Button>
            </div>

            {/* Add YouTube summary feature */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Video Resource Summary</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="youtube-link" className="text-sm font-medium text-gray-700 block mb-1">
                    YouTube Link
                  </label>
                  <div className="flex space-x-3">
                    <Input
                      id="youtube-link"
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      placeholder="Enter YouTube URL"
                      className="flex-grow"
                    />
                    <Button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary || !youtubeLink}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <span className="animate-spin mr-2">&#9696;</span>
                          Summarizing...
                        </>
                      ) : (
                        "Get Summary"
                      )}
                    </Button>
                  </div>
                </div>

                {summary && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Video Summary
                    </label>
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200 min-h-[100px] whitespace-pre-wrap">
                      {summary}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <SyllabusEditor
              syllabus={syllabus}
              setSyllabus={setSyllabus}
            />

            <ContentSettings
              textAmount={textAmount}
              setTextAmount={setTextAmount}
            />

            <div className="py-8 flex justify-end gap-4">
              <Button
                onClick={handleGenerateSlides}
                disabled={isGeneratingSlides}
                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px] px-6"
              >
                {isGeneratingSlides ? (
                  <>
                    <span className="animate-spin mr-2">&#9696;</span>
                    Generating Slides...
                  </>
                ) : (
                  "Generate Slides"
                )}
              </Button>


              <Button
                onClick={() => router.push(`/my-courses/create-syllabus/${courseData.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] px-6"
              >
                View Generated Slides
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/my-courses')}
                className="px-6 min-w-[120px] text-gray-900 border-gray-300 bg-white"
              >
                Cancel
              </Button>

              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px] px-6"
                onClick={handleCreateCourse}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">&#9696;</span>
                    Creating...
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
} 