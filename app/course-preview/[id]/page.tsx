"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Maximize, Minimize } from "lucide-react"
import { LightCourseLayout } from "@/components/layout/LightCourseLayout"
import { SlideViewer } from "@/components/creator-edit/slide-viewer"

export default function CoursePreviewPage({ params }: { params: { id: string } }) {
  const courseId = params.id
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState([])
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [courseTitle, setCourseTitle] = useState("Course Preview")

  // Load course data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('previewCourseData')
    if (savedData) {
      const data = JSON.parse(savedData)
      setSlides(data.slides || [])
      setCurrentSlide(data.currentSlide || 0)
      setCourseTitle(`Preview: ${data.slides[data.currentSlide]?.title || 'Course'}`)
    } else {
      // Redirect back if no data is found
      router.push(`/creator-edit/${courseId}`)
    }
  }, [courseId, router])

  // Function to toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`)
      })
      setIsFullScreen(true)
    } else {
      document.exitFullscreen()
      setIsFullScreen(false)
    }
  }

  // Add fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Navigation functions
  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
      setCourseTitle(`Preview: ${slides[currentSlide - 1]?.title || 'Course'}`)
    }
  }

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
      setCourseTitle(`Preview: ${slides[currentSlide + 1]?.title || 'Course'}`)
    }
  }

  return (
    <LightCourseLayout title={courseTitle}>
      {/* Control buttons */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <Button
          onClick={() => router.push(`/creator-edit/${courseId}`)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-full w-10 h-10 flex items-center justify-center"
          title="Back to editor"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <Button
        onClick={toggleFullScreen}
        className="fixed top-4 right-4 z-50 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-full w-10 h-10 flex items-center justify-center"
        title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullScreen ? (
          <Minimize className="h-5 w-5" />
        ) : (
          <Maximize className="h-5 w-5" />
        )}
      </Button>

      {/* Main content */}
      <div className="flex h-[calc(100vh-64px)] overflow-hidden justify-center max-w-[1800px] mx-auto px-6 py-6 bg-gray-50">
        <div className="w-full max-w-4xl flex flex-col">
          {/* Slide viewer */}
          {slides.length > 0 && (
            <SlideViewer
              currentSlide={currentSlide}
              totalSlides={slides.length}
              slideContent={slides[currentSlide]?.slide_markdown || ''}
            />
          )}

          {/* Navigation controls */}
          <div className="flex justify-between mt-4 px-4">
            <Button
              onClick={goToPrevSlide}
              disabled={currentSlide === 0}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Previous
            </Button>
            <div className="text-gray-600">
              Slide {currentSlide + 1} of {slides.length}
            </div>
            <Button
              onClick={goToNextSlide}
              disabled={currentSlide === slides.length - 1}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </LightCourseLayout>
  )
} 