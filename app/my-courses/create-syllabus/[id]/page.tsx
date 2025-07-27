"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Download, X } from "lucide-react"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { getSlides } from "@/components/create-syllabus/utils/api-endpoints"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Define the slide structure based on the JSON
interface SlideType {
    title: string;
    content: string;
}

export default function SlidesPage({ params }: { params: { id: number } }) {
    const router = useRouter()
    const courseId = params.id // The course title is now directly from the URL

    const [slides, setSlides] = useState<SlideType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedSlide, setSelectedSlide] = useState<number | null>(null)

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

    // Fetch slides from API
    useEffect(() => {
        const fetchSlides = async () => {
            try {
                setIsLoading(true);

                // Call the API to get slides
                const slidesData = await getSlides(courseId);

                if (Array.isArray(slidesData)) {
                    setSlides(slidesData);
                } else {
                    // Handle unexpected response format
                    console.error("Invalid slides data format:", slidesData);
                    setError("Failed to load slides: Invalid data format");
                    setSlides([{
                        title: "Error Loading Slides",
                        content: "There was a problem loading the slides. Please try again later."
                    }]);
                }
            } catch (error) {
                console.error("Error loading slides:", error);
                setError("Failed to load slides");
                setSlides([{
                    title: "Error Loading Slides",
                    content: "There was a problem loading the slides. Please try again later."
                }]);
            } finally {
                setIsLoading(false);
            }
        };

        if (courseId) {
            fetchSlides();
        }
    }, [courseId]);

    // Handle export slides
    const exportSlides = () => {
        const dataStr = JSON.stringify(slides, null, 2);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

        const exportFileDefaultName = `slides.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    // New custom mini-slide component for the grid view
    const MiniSlide = ({ title, content, index }: { title: string; content: string; index: number }) => {
        return (
            <div
                className="bg-white rounded-lg shadow-md h-full overflow-hidden flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedSlide(index)}
            >
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3">
                    <h3 className="font-bold text-white text-md truncate">{title}</h3>
                    <p className="text-xs text-white/70">Slide {index + 1}</p>
                </div>
                <div className="p-3 flex-1 overflow-auto">
                    <div className="prose prose-xs max-h-48 overflow-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="flex-1 bg-gray-50 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center p-4 border-b">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push(`/my-courses/create-syllabus`)}
                                className="flex items-center gap-2 text-black"
                            >
                                <ArrowLeft size={16} />
                                Back to Editor
                            </Button>
                            <h1 className="text-xl font-semibold">{courseId} - Slides</h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-medium">Course Slides Overview</h2>
                            <Button
                                variant="outline"
                                onClick={exportSlides}
                                className="flex items-center gap-2 text-black"
                            >
                                <Download size={16} />
                                Export
                            </Button>
                            <FullscreenButton
                                isFullScreen={isFullScreen}
                                onToggle={toggleFullScreen}
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-[calc(100vh-160px)]">
                            <div className="animate-spin mr-2">&#9696;</div>
                            <span>Loading slides...</span>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-[calc(100vh-160px)] text-red-500">
                            {error}
                        </div>
                    ) : (
                        <div className="px-12 py-6 overflow-auto h-[calc(100vh-160px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                                {slides.map((slide, index) => (
                                    <MiniSlide
                                        key={index}
                                        title={slide.title}
                                        content={slide.content}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for expanded slide view */}
            {selectedSlide !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white">{slides[selectedSlide].title}</h2>
                                <p className="text-sm text-white/70">Slide {selectedSlide + 1} of {slides.length}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedSlide(null)}
                                className="text-white hover:bg-white/20"
                            >
                                <X size={24} />
                            </Button>
                        </div>
                        <div className="p-6 overflow-auto flex-1">
                            <div className="prose prose-lg max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {slides[selectedSlide].content}
                                </ReactMarkdown>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 p-4 flex justify-between">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedSlide(prev => Math.max(0, prev! - 1))}
                                disabled={selectedSlide === 0}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft size={16} />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setSelectedSlide(prev => Math.min(slides.length - 1, prev! + 1))}
                                disabled={selectedSlide === slides.length - 1}
                                className="flex items-center gap-2"
                            >
                                Next
                                <ArrowRight size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    )
}
