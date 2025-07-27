// app/courses/[id]/components/SlideViewer.tsx
'use client'

import { Button } from "@/components/ui/button"
import { Slide } from "@/components/slide"

export const SlideViewer = ({
    slides,
    currentSlideIndex,
    setCurrentSlideIndex
}: {
    slides: { title: string; content: string }[],
    currentSlideIndex: number,
    setCurrentSlideIndex: (index: number) => void
}) => {
    return (
        <div className="relative flex flex-col flex-1">
            <div className="relative flex-1 overflow-auto mb-6">
                {slides.map((slide, index) => (
                    <Slide
                        key={index}
                        title={slide.title}
                        content={slide.content}
                        index={index}
                        isActive={index === currentSlideIndex}
                    />
                ))}
            </div>

            <div className="flex justify-between mt-4 relative z-10">
                <Button
                    variant="outline"
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                >
                    Previous
                </Button>
                <span className="text-sm text-gray-500">
                    Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <Button
                    variant="outline"
                    onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}