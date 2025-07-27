"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { LightCourseLayout } from "@/components/layout/LightCourseLayout"
import { CourseNavigation } from "@/components/creator-edit/course-navigation"
import { SlideViewer } from "@/components/creator-edit/slide-viewer"
import { SlideGallery } from "@/components/creator-edit/slide-gallery"
import { ChatInput } from "@/components/creator-edit/chat-input"
import { CourseControls } from "@/components/creator-edit/course-controls"

// Sample slides data
const slides = [
  {
    id: 1,
    title: "Course Introduction",
    slide_markdown: `
# Introduction to Calculus 📚
**Welcome to the course!** We'll explore the foundational concepts of calculus, starting with *limits*.

> *"Mathematics is not about numbers, equations, computations, or algorithms: it is about understanding."* — William Thurston

## What You'll Learn:
- The meaning and **intuition** behind limits
- How to compute limits
    `,
    transcript: "Welcome to our course. Today we will discuss the basic concepts of limits. Limits are a core concept in calculus that helps us understand the behavior of functions near a particular point.",
    preview: "/pics/1.jpg",
  },
  {
    id: 2,
    title: "Learning Resources",
    slide_markdown: `
## Recommended Resources
- 📌 [MIT OpenCourseWare](https://ocw.mit.edu/courses/mathematics/)
- 📌 [Paul's Online Math Notes](http://tutorial.math.lamar.edu/)
- 📌 [Khan Academy - Limits](https://www.khanacademy.org/math/calculus-1/cs1-limits-and-continuity)

🎯 Let's begin! 🚀
    `,
    transcript: "These are the recommended learning resources that will help you better understand the concept of limits.",
    preview: "/pics/1.jpg",
  },
  {
    id: 3,
    title: "Basic Concepts",
    slide_markdown: `
## **Basic Concepts of Limits**
1. **Intuitive understanding**: What does it mean for a function to "approach" a value?
2. **Formal definition (ε-δ approach)**: The rigorous mathematical definition
3. **One-sided limits**: Evaluating from the left or the right
    `,
    transcript: "Let's delve into the main concepts. First, we need to understand what a function's limit is. Simply put, when we discuss the limit of a function at a certain point, we are considering the behavior of the function values as the variable approaches that point.",
    preview: "/pics/2.jpg",
  },
  {
    id: 4,
    title: "Mathematical Definition",
    slide_markdown: `
## **Mathematical Definition**
We say that:

$$
\\lim_{x \\to a} f(x) = L
$$

if for every \\(\\epsilon > 0\\), there exists a \\(\\delta > 0\\) such that whenever \\(|x - a| < \\delta\\), then \\(|f(x) - L| < \\epsilon\\).

> **Note:** The \\(\\epsilon\\)-\\(\\delta\\) definition ensures rigor in our understanding of limits.
    `,
    transcript: "This is the strict mathematical definition of limits using the epsilon-delta method. This definition helps us formally express how f(x) approaches L as x approaches a.",
    preview: "/pics/2.jpg",
  },
  {
    id: 5,
    title: "C++ Example (Part 1)",
    slide_markdown: `
## **Numerical Limit Approximation in C++**
**Approximating \\( e \\) using the limit definition**:

$$
e = \\lim_{n \\to \\infty} (1 + 1/n)^n
$$

\`\`\`cpp
#include <iostream>
#include <cmath>

void calculate_e_approximation() {
  const int MAX_ITERATIONS = 1'000'000;
  double best_approximation = 0.0;
  
  for(int n = 1; n <= MAX_ITERATIONS; ++n) {
    double current = std::pow(1.0 + 1.0/n, n);
    if(std::abs(current - best_approximation) < 1e-10) break;
    best_approximation = current;
    
    if(n % 100'000 == 0) {
      std::cout << "Iteration " << n 
                << ": Approximation = " << current
                << " | Error = " << std::abs(current - M_E)
                << "\\n";
    }
  }
  
  std::cout << "Final Approximation: " << best_approximation
            << "\\nExact Value of e: " << M_E
            << "\\nAbsolute Error: " << std::abs(best_approximation - M_E)
            << std::endl;
}
\`\`\`
    `,
    transcript: "This is the second part of the C++ implementation, showing how we can iterate to calculate the value of e precisely.",
    preview: "/pics/code.jpg",
  },
  {
    id: 7,
    title: "Code Explanation",
    slide_markdown: `
### **Explanation**
- **Precision Control**: Uses stopping condition when change < 1e-10
- **Progress Tracking**: Logs every 100,000 iterations
- **Error Analysis**: Compares approximation with actual \\( e \\) value

> **💡 Tip:** Computational approaches to limits help reinforce theoretical concepts!
    `,
    transcript: "This code example demonstrates how programming methods can verify mathematical limit concepts, especially the famous limit expression for e.",
    preview: "/pics/code.jpg",
  },
  {
    id: 8,
    title: "Summary",
    slide_markdown: `
## **Summary**
✅ Limits describe function behavior near specific points  
✅ They form the foundation for **continuity** and **derivatives**  
✅ Computational approaches can approximate theoretical limits  

> **Reminder:** A function **does not** necessarily have a limit at every point!
    `,
    transcript: "Let's summarize what we've learned today. We discussed the basic concepts of limits, learned how to intuitively understand limits, and how to calculate simple limits using algebraic methods.",
    preview: "/pics/2.jpg",
  },
  {
    id: 9,
    title: "Concept Table",
    slide_markdown: `
### **Concept Table**
| Concept         | Definition |
|----------------|------------|
| One-sided Limit | Evaluates from one direction |
| Infinite Limit | Function approaches ±∞ |
| Limit at a Point | Function nears a specific value |
    `,
    transcript: "This table summarizes different types of limit concepts to help you understand the distinctions between them.",
    preview: "/pics/2.jpg",
  },
  {
    id: 10,
    title: "Advanced Concepts",
    slide_markdown: `
## **Advanced Limit Concepts**
🔹 **Limits at Infinity:** Understanding how functions behave as \\( x \\to \\infty \\)  
🔹 **Squeeze Theorem:** Using bounding functions to determine limits  
🔹 **L'Hôpital's Rule:** A method for evaluating indeterminate forms  
🔹 **Multivariable Limits:** Extending limits to higher dimensions  
    `,
    transcript: "Let's explore some more advanced limit concepts that will be discussed in more detail in future lessons...",
    preview: "/pics/3.jpg",
  },
  {
    id: 11,
    title: "L'Hôpital's Rule",
    slide_markdown: `
### **L'Hôpital's Rule**
If the following limit results in an **indeterminate form** such as \\( \\frac{0}{0} \\) or \\( \\frac{\\infty}{\\infty} \\):

$$
\\lim_{x \\to a} \\frac{f(x)}{g(x)}
$$

then we can apply **L'Hôpital's Rule**, which states:

$$
\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f'(x)}{g'(x)}
$$
    `,
    transcript: "L'Hôpital's Rule is a powerful tool for solving certain types of limit problems, especially when dealing with indeterminate forms.",
    preview: "/pics/3.jpg",
  },
  {
    id: 12,
    title: "L'Hôpital's Rule Application",
    slide_markdown: `
### **Example Calculation**
Evaluate:

$$
\\lim_{x \\to 0} \\frac{\\sin x}{x}
$$

Using L'Hôpital's Rule:

$$
\\lim_{x \\to 0} \\frac{\\sin x}{x} = \\lim_{x \\to 0} \\frac{\\cos x}{1} = \\cos(0) = 1
$$

> **Note:** In this case, the limit can also be solved using the Squeeze Theorem.
    `,
    transcript: "This example shows how to use L'Hôpital's Rule to calculate a classic limit problem.",
    preview: "/pics/3.jpg",
  }
];

export default function OnlineCourse({ params }: { params: { id: string } }) {
  const courseId = params.id
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const router = useRouter()

  // Function to handle preview click
  const handlePreview = () => {
    // Store the current state in localStorage for preview mode
    localStorage.setItem('previewCourseData', JSON.stringify({
      courseId,
      slides,
      currentSlide
    }))
    
    // Navigate to preview page (will be implemented)
    router.push(`/course-preview/${courseId}`)
  }

  // TODO: API endpoint - Fetch course data
  // useEffect(() => {
  //   async function fetchCourseData() {
  //     try {
  //       // const response = await fetch(`/api/courses/${courseId}`);
  //       // if (!response.ok) throw new Error('Failed to fetch course data');
  //       // const data = await response.json();
  //       // setSlides(data.slides);
  //       // Additional course data handling here
  //     } catch (error) {
  //       console.error('Error fetching course data:', error);
  //       router.push('/courses_v2');
  //     }
  //   }
  //   fetchCourseData();
  // }, [courseId, router]);

  // Get current course title
  const courseTitle = slides.length > 0 ?
    `Edit Calculus I: ${slides[currentSlide].title}` :
    "Edit Calculus I: Introduction to Limits";

  const handleExit = () => {
    setIsExitDialogOpen(false)
    
    // TODO: API endpoint - Save course progress
    // async function saveProgress() {
    //   try {
    //     // const response = await fetch(`/api/courses/${courseId}/progress`, {
    //     //   method: 'POST',
    //     //   headers: { 'Content-Type': 'application/json' },
    //     //   body: JSON.stringify({ 
    //     //     lastSlideIndex: currentSlide,
    //     //     completedAt: new Date().toISOString()
    //     //   })
    //     // });
    //     // if (!response.ok) throw new Error('Failed to save progress');
    //   } catch (error) {
    //     console.error('Error saving progress:', error);
    //   }
    // }
    // saveProgress();
    
    setTimeout(() => {
      router.push("/my-courses")
    }, 100)
  }

  // Add fullscreen toggle function
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Fullscreen error: ${err.message}`)
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

  return (
    <LightCourseLayout title={courseTitle}>
      {/* Course control buttons */}
      <CourseControls 
        onExitClick={() => setIsExitDialogOpen(true)}
        isFullScreen={isFullScreen}
        toggleFullScreen={toggleFullScreen}
        onPreviewClick={handlePreview}
      />

      {/* Main layout */}
      <div className="flex h-[calc(100vh-64px)] overflow-hidden gap-6 max-w-[1800px] mx-auto px-6 py-6 bg-gray-50">
        {/* Left panel - Course navigation */}
        <CourseNavigation
          slides={slides}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
        />

        {/* Middle panel - Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <SlideViewer
            currentSlide={currentSlide}
            totalSlides={slides.length}
            slideContent={slides[currentSlide].slide_markdown}
          />
          
          {/* Chat input */}
          <ChatInput
            courseId={courseId}
            slideIndex={currentSlide}
          />
        </div>

        {/* Right panel - Slide Gallery */}
        <SlideGallery
          slides={slides}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
        />
      </div>

      {/* Exit Dialog */}
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle>Leave Course?</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to exit this course? Your progress will be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsExitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleExit}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Exit Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LightCourseLayout>
  )
}