"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Upload, 
  BookOpen, 
  ClipboardList, 
  Presentation, 
  Check, 
  ArrowLeft, 
  ArrowRight,
  Search,
  PlusCircle,
  Globe,
  Clock,
  DollarSign,
  Eye,
  Users,
  Settings,
  Tag,
  X,
  Lock,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"

// Fix import to use the component that accepts children
import { HeaderWithLogo } from "@/components/layout/HeaderWithLogo"
import Link from "next/link"

// Define types/interfaces for better type safety
interface Subtopic {
  title: string;
  description: string;
}

interface CourseSection {
  title: string;
  description: string;
  subtopics?: Subtopic[];
  content?: string; // Handle legacy property
  subsections?: { title: string; content: string; }[]; // Handle legacy property
}

interface Course {
  id: number;
  title: string;
  description: string;
  status: string;
  author: string;
  lastAccessed: string;
  course_outline?: CourseSection[];
  syllabus?: { sections: CourseSection[] }; // Handle legacy property
  slides: number;
  visibility: string;
}

// Sample data for existing courses
const existingCourses: Course[] = [
  {
    id: 1,
    title: "Introduction to C++ Programming",
    description: "Learn the fundamentals of C++ programming language for beginners.",
    status: "Draft",
    author: "me",
    lastAccessed: "2024-04-15T09:30:00",
    course_outline: [
      {
        "title": "Object-Oriented Programming (OOP)",
        "description": "Introduction to object-oriented programming concepts and perspectives.",
        "subtopics": [
          {
            "title": "Programmer Perspectives",
            "description": "Benefits of using OOP for structuring programs, including improved code correctness and fewer bugs."
          },
          {
            "title": "Compiler Perspective",
            "description": "How the compiler supports OOP constructs and the meaning of construction in programming."
          },
          {
            "title": "Designer Perspective (Basic Software Engineering)",
            "description": "How to use the OOP paradigm to solve problems effectively."
          },
          {
            "title": "Hello World in C and C++",
            "description": "Basic \"Hello World\" program examples in C and C++, illustrating the syntax and structure of each language. Includes explanation of std::cout and std::endl in C++."
          }
        ]
      },
      {
        "title": "Input/Output Streams and Operators",
        "description": "Working with input/output streams in C++.",
        "subtopics": [
          {
            "title": "Input/Output Streams",
            "description": "Using cout/cerr for printing to standard output/error and cin for reading from standard input."
          },
          {
            "title": "I/O Operators",
            "description": "Using the insertion operator (<<) for output and the extraction operator (>>) for input. Includes an example of reading two integers and printing their sum."
          },
          {
            "title": "Potential Reading Errors",
            "description": "Possible errors during input reading, such as incorrect data types, values exceeding limits, and end-of-file (EOF). Includes an explanation of how input reading statement failure can occur."
          },
          {
            "title": "Checking for Input Reading Failure",
            "description": "Using cin.fail() and cin.eof() to detect reading errors, including EOF. Provides an example of stopping input reading on bad input or EOF."
          },
          {
            "title": "Implicit Conversion and Operator Overloading",
            "description": "Explanation of implicit conversion from cin (istream) to bool. Discusses how the compiler resolves operator overloading based on the number and type of arguments, with an example of the extraction operator (>>)."
          }
        ]
      },
      {
        "title": "Strings",
        "description": "Working with strings in C++.",
        "subtopics": [
          {
            "title": "C-style Strings vs. C++ Strings",
            "description": "Comparison of C-style strings (char arrays) and C++ strings (std::string). C++ strings offer automatic memory management and safer manipulation. Includes an example of initializing a C++ string from a C-style string."
          },
          {
            "title": "String Operations",
            "description": "Basic string operations like length(), accessing individual characters, equality/inequality comparisons, concatenation, and lexicographical comparison. Includes an example demonstrating string comparison."
          },
          {
            "title": "String Input with cin and getline",
            "description": "Reading strings from input using cin (ignores leading whitespace and reads one word) and getline (reads the entire line, including whitespace)."
          },
          {
            "title": "String Streams",
            "description": "Using istringstream to extract data from strings and ostringstream to format data into strings. Includes examples of converting an integer to a string and vice versa."
          }
        ]
      },
      {
        "title": "Command Line Arguments",
        "description": "Handling command-line arguments in C++.",
        "subtopics": [
          {
            "title": "argc and argv",
            "description": "Explanation of argc (number of command-line arguments + 1) and argv (array of C-style strings representing the arguments). Includes an example of iterating through the command-line arguments."
          },
          {
            "title": "Converting to C++ Strings",
            "description": "Converting C-style strings in argv to C++ strings for easier manipulation."
          },
          {
            "title": "Input vs. Command-Line Arguments",
            "description": "Differentiating between standard input and command-line arguments. Provides an example of how to handle input redirection using <."
          }
        ]
      }
    ],
    slides: 24,
    visibility: "Private"
  },
  {
    id: 2,
    title: "Machine Learning Fundamentals",
    description: "Understand core machine learning concepts and implementations.",
    status: "Draft",
    author: "me",
    lastAccessed: "2024-04-10T14:20:00",
    course_outline: [
      {
        title: "Data Preprocessing",
        description: "Cleaning and preparing data for machine learning models",
        subtopics: [
          { title: "Data Cleaning", description: "Removing inconsistencies and errors from datasets" },
          { title: "Feature Scaling", description: "Normalizing and standardizing features" }
        ]
      },
      {
        title: "Model Training",
        description: "Understanding how models learn from data",
        subtopics: [
          { title: "Loss Functions", description: "Different types of loss functions" },
          { title: "Optimization", description: "Gradient descent and variants" }
        ]
      },
      {
        title: "Model Evaluation",
        description: "Assessing model performance and accuracy",
        subtopics: [
          { title: "Metrics", description: "Common evaluation metrics for models" },
          { title: "Validation Techniques", description: "Cross-validation and holdout methods" }
        ]
      }
    ],
    slides: 32,
    visibility: "Private"
  },
  {
    id: 3,
    title: "Deep Learning with Python",
    description: "Dive into neural networks using Python and popular frameworks.",
    status: "Draft",
    author: "me",
    lastAccessed: "2024-04-05T11:45:00",
    syllabus: {
      sections: [
        {
          title: "Python for Deep Learning",
          description: "Essential Python skills for AI development",
          content: "Python basics for AI development"
        },
        {
          title: "TensorFlow and PyTorch",
          description: "Deep learning framework comparison and usage",
          content: "Introduction to deep learning frameworks",
          subsections: [
            { title: "TensorFlow Basics", content: "Tensors and operations" },
            { title: "PyTorch Fundamentals", content: "Dynamic computation graphs" }
          ]
        },
        {
          title: "Building Neural Networks",
          description: "Creating, training and evaluating neural networks",
          content: "Creating and training neural networks"
        }
      ]
    },
    slides: 40,
    visibility: "Private"
  },
  {
    id: 4,
    title: "Introduction to AI",
    description: "Learn the basics of artificial intelligence and machine learning.",
    status: "Draft",
    author: "me",
    lastAccessed: "2024-04-18T16:15:00",
    syllabus: {
      sections: [
        {
          title: "AI Overview",
          description: "Introduction to the field of artificial intelligence",
          content: "Introduction to artificial intelligence"
        },
        {
          title: "Machine Learning Basics",
          description: "Understanding the fundamentals of machine learning",
          content: "Core machine learning concepts"
        }
      ]
    },
    slides: 28,
    visibility: "Private"
  },
  {
    id: 5,
    title: "Introduction to AI",
    description: "Learn the basics of artificial intelligence and machine learning.",
    status: "Draft",
    author: "me",
    lastAccessed: "2024-04-02T08:45:00",
    syllabus: {
      sections: [
        {
          title: "AI Basics",
          description: "Core artificial intelligence concepts and history",
          content: "Fundamental concepts in AI"
        },
        {
          title: "Machine Learning",
          description: "Approaches and applications for machine learning",
          content: "Introduction to machine learning"
        }
      ]
    },
    slides: 18,
    visibility: "Private"
  },
  {
    id: 6,
    title: "Introduction to AI",
    description: "Learn the basics of artificial intelligence and machine learning.",
    status: "Draft",
    author: "me",
    lastAccessed: "2024-04-12T13:20:00",
    syllabus: {
      sections: [
        {
          title: "Introduction",
          description: "What is artificial intelligence and its applications",
          content: "What is artificial intelligence"
        },
        {
          title: "Core Concepts",
          description: "Fundamental principles of AI and machine learning",
          content: "Key ideas in AI and ML"
        }
      ]
    },
    slides: 22,
    visibility: "Private"
  },
  {
    id: 7,
    title: "Introduction to AI",
    description: "Learn the basics of artificial intelligence and machine learning.",
    status: "Draft",
    author: "me",
    lastAccessed: "2024-04-17T10:05:00",
    syllabus: {
      sections: [
        {
          title: "AI Fundamentals",
          description: "Foundational concepts in artificial intelligence",
          content: "The basics of artificial intelligence"
        },
        {
          title: "Machine Learning",
          description: "Introduction to learning algorithms and models",
          content: "Introduction to machine learning"
        }
      ]
    },
    slides: 20,
    visibility: "Private"
  }
];

// Sample labels for courses
const availableLabels = [
  { id: 1, name: "Programming", color: "#0ea5e9" },
  { id: 2, name: "Data Science", color: "#10b981" },
  { id: 3, name: "Machine Learning", color: "#8b5cf6" },
  { id: 4, name: "Artificial Intelligence", color: "#f43f5e" },
  { id: 5, name: "Computer Science", color: "#f59e0b" },
  { id: 6, name: "Python", color: "#6366f1" },
  { id: 7, name: "JavaScript", color: "#facc15" },
  { id: 8, name: "Beginner", color: "#84cc16" },
  { id: 9, name: "Advanced", color: "#ef4444" }
];

// Define the steps for the course publishing process
const steps = [
  { id: "select", label: "Select Course", icon: BookOpen },
  { id: "preview", label: "Preview Content", icon: Eye },
  { id: "settings", label: "Publishing Settings", icon: Settings },
  { id: "review", label: "Final Review", icon: ClipboardList }
];

export default function PublishDetailsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState("select");
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishSettings, setPublishSettings] = useState({
    visibility: "Public",
    allowComments: true,
    scheduledDate: "",
    labels: [1, 3] // Default selected labels (Programming and Machine Learning)
  });
  const [newLabelInput, setNewLabelInput] = useState("");
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // First make sure the getSelectedCourseData function is defined before usage
  const getSelectedCourseData = (id: number | null): Course | null => {
    if (id === null) return null;
    
    const course = existingCourses.find(course => course.id === id);
    if (!course) return null;
    
    // Convert legacy syllabus structure to course_outline if needed
    if (!course.course_outline && course.syllabus) {
      // Create a new object to avoid mutating the original
      return {
        ...course,
        course_outline: course.syllabus.sections.map((section: CourseSection) => {
          return {
            title: section.title,
            description: section.description || section.content || "", // Provide fallback
            subtopics: section.subsections ? section.subsections.map(sub => ({
              title: sub.title,
              description: sub.content
            })) : []
          };
        })
      };
    }
    
    return course;
  };

  // For debugging - add a simple log to verify the data
  useEffect(() => {
    if (selectedCourse !== null) {
      const courseData = getSelectedCourseData(selectedCourse);
      console.log('Selected course data:', courseData);
      if (courseData?.course_outline) {
        console.log('Course outline:', courseData.course_outline);
        courseData.course_outline.forEach((section, i) => {
          console.log(`Section ${i}: ${section.title} - subtopics:`, section.subtopics);
        });
      }
    }
  }, [selectedCourse]);

  // Get selected course data by calling the conversion function
  const selectedCourseData = getSelectedCourseData(selectedCourse);

  // Filter courses based on search query and sort by recently accessed
  const filteredCourses = existingCourses
    .filter(course => 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
  
  // Helper to determine if a step is the current one
  const isCurrentStep = (stepId: string) => currentStep === stepId;
  
  // Helper to determine if a step is completed
  const isCompletedStep = (stepId: string) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const stepIndex = steps.findIndex(step => step.id === stepId);
    return stepIndex < currentIndex;
  };
  
  // Navigate to the next or previous step
  const goToStep = (stepId: string) => {
    setCurrentStep(stepId);
  };
  
  const goToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };
  
  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleSelectCourse = (courseId: number) => {
    setSelectedCourse(courseId);
  };

  const handlePublishSettingChange = (key: string, value: any) => {
    setPublishSettings({
      ...publishSettings,
      [key]: value
    });
  };

  const toggleLabel = (labelId: number) => {
    if (publishSettings.labels.includes(labelId)) {
      // Remove label if already selected
      handlePublishSettingChange(
        "labels",
        publishSettings.labels.filter(id => id !== labelId)
      );
    } else {
      // Add label if not selected
      handlePublishSettingChange(
        "labels",
        [...publishSettings.labels, labelId]
      );
    }
  };

  const addNewLabel = () => {
    if (newLabelInput.trim()) {
      // In a real app, you would make an API call to add the label
      // Here we'll just simulate adding it to the availableLabels array
      const randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
      
      // For now, alert that label functionality would be implemented in production
      alert(`In production, this would add a new label: "${newLabelInput}" with color ${randomColor}`);
      
      setNewLabelInput("");
    }
  };

  const toggleSection = (sectionIndex: number) => {
    console.log(`Toggling section ${sectionIndex}`);
    console.log('Current expanded sections:', expandedSections);
    
    setExpandedSections(prev => {
      const newExpandedSections = prev.includes(sectionIndex)
        ? prev.filter(i => i !== sectionIndex)
        : [...prev, sectionIndex];
      
      console.log('New expanded sections:', newExpandedSections);
      return newExpandedSections;
    });
  };
  
  // Make all sections expanded by default for testing
  // Uncomment this if you want to start with all sections expanded
  // useEffect(() => {
  //   if (selectedCourseData?.course_outline && selectedCourseData.course_outline.length > 0) {
  //     const allSectionIndexes = selectedCourseData.course_outline.map((_, index) => index);
  //     setExpandedSections(allSectionIndexes);
  //   }
  // }, [selectedCourseData]);

  // Function to handle publishing the course
  const handlePublishCourse = () => {
    // Show publishing state
    setIsPublishing(true);
    
    // Simulate API call to create/publish the course
    setTimeout(() => {
      console.log("Publishing course:", selectedCourseData?.title);
      console.log("With settings:", publishSettings);
      
      // In a real application, you would make an API call here
      // to save the course data with the publish settings
      
      // Navigate to my-channel page after "publishing"
      router.push("/my-publish/my-channel");
    }, 1000); // Simulate a network delay
  };

  return (
    <div>
      <HeaderWithLogo />
      <div className="h-[calc(100vh-64px)]">
        <ScrollArea className="h-full">
          <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-12">
            <div className="flex gap-12 min-h-[500px]">
              {/* Step Navigation - Position in the left middle area with title */}
              <div className="w-52 sticky" style={{ alignSelf: 'flex-start', top: 'calc(50vh - 250px)' }}>
                {/* Title now in sidebar */}
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Publish Course</h1>
                
                <div className="relative">
                  {steps.map((step, index) => (
                    <div key={step.id} className="relative">
                      {/* Vertical line connecting steps */}
                      {index < steps.length - 1 && (
                        <div 
                          className={`absolute top-8 left-[15px] h-16 w-0.5 ${
                            isCompletedStep(step.id) ? "bg-emerald-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                      
                      {/* Step button */}
                      <button
                        className="flex items-center mb-16 group"
                        onClick={() => goToStep(step.id)}
                        disabled={selectedCourse === null && step.id !== "select"}
                      >
                        {/* Step circle indicator */}
                        <div 
                          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            isCurrentStep(step.id) 
                              ? "border-emerald-500 bg-emerald-50 text-emerald-600" 
                              : isCompletedStep(step.id)
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : selectedCourse === null && step.id !== "select"
                                  ? "border-gray-300 bg-gray-100 text-gray-400"
                                  : "border-gray-300 bg-white text-gray-400"
                          }`}
                        >
                          {isCompletedStep(step.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <step.icon className="h-4 w-4" />
                          )}
                        </div>
                        
                        {/* Step label */}
                        <span 
                          className={`ml-4 text-base ${
                            isCurrentStep(step.id) 
                              ? "font-semibold text-gray-900" 
                              : isCompletedStep(step.id)
                                ? "font-medium text-emerald-600"
                                : selectedCourse === null && step.id !== "select"
                                  ? "font-medium text-gray-400"
                                  : "font-medium text-gray-500"
                          } group-hover:text-gray-900`}
                        >
                          {step.label}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Step Content */}
              <div className="flex-1">
                {/* Select Course Content */}
                {currentStep === "select" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-800">Select a Course to Publish</h2>
                    <p className="text-gray-600">
                      Choose from your recently accessed courses or create a new one from scratch.
                    </p>
                    
                    {/* Search bar */}
                    <div className="relative w-full max-w-md mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input 
                        placeholder="Search your courses..." 
                        className="pl-10 border border-gray-200 focus:border-gray-300 bg-gray-50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {filteredCourses.length > 0 ? (
                      <div className="overflow-hidden">
                        <div className="h-[380px] overflow-y-auto pr-2 -mr-2">
                          {filteredCourses.map(course => (
                            <div 
                              key={course.id}
                              className={`border rounded-lg p-4 mb-4 cursor-pointer transition-all duration-200 ${
                                selectedCourse === course.id 
                                  ? 'border-emerald-500 bg-emerald-50' 
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                              onClick={() => handleSelectCourse(course.id)}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{course.title}</h3>
                                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                    <span>By {course.author}</span>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-2">{course.description}</p>
                                </div>
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                  {course.status}
                                </span>
                              </div>
                              {selectedCourse === course.id && (
                                <div className="mt-2 text-sm text-emerald-600 font-medium">
                                  Selected for publishing
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50 mt-4">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <BookOpen className="h-12 w-12 text-gray-400" />
                          <div>
                            <p className="text-gray-700 font-medium">No courses found</p>
                            <p className="text-gray-500 text-sm mt-1">
                              You don't have any courses yet, or none match your search.
                            </p>
                          </div>
                          <Link href="/my-courses/create">
                            <Button className="mt-2 bg-emerald-600 hover:bg-emerald-700">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Create New Course
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Preview Content */}
                {currentStep === "preview" && selectedCourseData && (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">Preview Course Content</h2>
                        <p className="text-gray-600 mt-1">
                          Review your course content before publishing. Make sure everything looks correct.
                        </p>
                      </div>
                    </div>
                    
                    {/* Course Info Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-800">{selectedCourseData.title}</h3>
                      <p className="text-gray-600 mt-2">{selectedCourseData.description}</p>
                      
                      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Presentation className="h-4 w-4" />
                          <span>{selectedCourseData.slides} slides</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Syllabus Preview */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="border-b border-gray-200 px-6 py-4">
                        <h3 className="text-md font-semibold text-gray-800">Course Syllabus</h3>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        {selectedCourseData && selectedCourseData.course_outline && selectedCourseData.course_outline.length > 0 ? (
                          selectedCourseData.course_outline.map((section: CourseSection, index: number) => (
                            <div key={index} className="group">
                              {/* Section header - clickable if has subsections */}
                              <div 
                                className={`flex justify-between p-4 ${
                                  section.subtopics && section.subtopics.length > 0 
                                    ? 'cursor-pointer hover:bg-gray-50' 
                                    : ''
                                }`}
                                onClick={() => {
                                  console.log('Section clicked:', section.title);
                                  console.log('Has subtopics:', section.subtopics && section.subtopics.length > 0);
                                  
                                  if (section.subtopics && section.subtopics.length > 0) {
                                    toggleSection(index);
                                  }
                                }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-800">{section.title}</h4>
                                    {section.subtopics && section.subtopics.length > 0 && (
                                      expandedSections.includes(index) ? 
                                        <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                  {section.description && (
                                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Subsections if they exist and section is expanded */}
                              {section.subtopics && 
                                section.subtopics.length > 0 && 
                                expandedSections.includes(index) && (
                                <div className="bg-gray-50 pb-2">
                                  {/* Debug logging */}
                                  {(() => { console.log(`Rendering subtopics for section ${index}:`, section.subtopics); return null; })()}
                                  {section.subtopics.map((subtopic: Subtopic, subIndex: number) => {
                                    console.log(`Rendering subtopic ${subIndex}:`, subtopic);
                                    return (
                                      <div key={subIndex} className="px-6 py-3 ml-6 border-l-2 border-gray-200">
                                        <div className="font-medium text-gray-700">{subtopic.title}</div>
                                        <div className="text-sm text-gray-600 mt-1">{subtopic.description}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-gray-500 text-center">
                            No syllabus content available for this course.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Slides Preview */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="border-b border-gray-200 px-6 py-4">
                        <h3 className="text-md font-semibold text-gray-800">Course Slides</h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[...Array(Math.min(8, selectedCourseData.slides))].map((_, index) => (
                            <div 
                              key={index}
                              className="aspect-[4/3] bg-gray-100 rounded-md flex items-center justify-center text-gray-400 border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                              <Presentation className="h-6 w-6" />
                            </div>
                          ))}
                          {selectedCourseData.slides > 8 && (
                            <div className="aspect-[4/3] bg-gray-50 rounded-md flex items-center justify-center text-gray-500 border border-gray-200">
                              <span className="text-sm font-medium">+{selectedCourseData.slides - 8} more</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Publishing Settings */}
                {currentStep === "settings" && selectedCourseData && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-800">Publishing Settings</h2>
                    <p className="text-gray-600">
                      Configure how your course will be published and who can access it.
                    </p>
                    
                    <div className="space-y-6">
                      {/* Labels/Tags Settings */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Tag className="h-5 w-5 text-gray-700" />
                          <h3 className="text-md font-medium text-gray-800">Course Labels</h3>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-4">
                          Add labels to help students find your course by topic
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {availableLabels.map(label => (
                            <button
                              key={label.id}
                              onClick={() => toggleLabel(label.id)}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm ${
                                publishSettings.labels.includes(label.id)
                                  ? "text-white"
                                  : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                              }`}
                              style={{ 
                                backgroundColor: publishSettings.labels.includes(label.id) ? label.color : undefined,
                              }}
                            >
                              {label.name}
                              {publishSettings.labels.includes(label.id) && (
                                <X className="w-3.5 h-3.5 ml-1.5 text-white" />
                              )}
                            </button>
                          ))}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <Input
                            type="text"
                            placeholder="Add new label..."
                            value={newLabelInput}
                            onChange={(e) => setNewLabelInput(e.target.value)}
                            className="w-full"
                          />
                          <Button 
                            onClick={addNewLabel}
                            disabled={!newLabelInput.trim()}
                            className="shrink-0"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                      
                      {/* Visibility Settings */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Globe className="h-5 w-5 text-gray-700" />
                          <h3 className="text-md font-medium text-gray-800">Visibility</h3>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              id="public" 
                              name="visibility"
                              checked={publishSettings.visibility === "Public"}
                              onChange={() => handlePublishSettingChange("visibility", "Public")}
                              className="h-4 w-4 text-emerald-600"
                            />
                            <div>
                              <label htmlFor="public" className="text-gray-800 font-medium">Public</label>
                              <p className="text-sm text-gray-500">Anyone can find and access your course</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              id="unlisted" 
                              name="visibility"
                              checked={publishSettings.visibility === "Unlisted"}
                              onChange={() => handlePublishSettingChange("visibility", "Unlisted")}
                              className="h-4 w-4 text-emerald-600"
                            />
                            <div>
                              <label htmlFor="unlisted" className="text-gray-800 font-medium">Unlisted</label>
                              <p className="text-sm text-gray-500">Only people with the link can access your course</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              id="group" 
                              name="visibility"
                              checked={publishSettings.visibility === "Group"}
                              onChange={() => handlePublishSettingChange("visibility", "Group")}
                              className="h-4 w-4 text-emerald-600"
                            />
                            <div>
                              <label htmlFor="group" className="text-gray-800 font-medium">Group</label>
                              <p className="text-sm text-gray-500">Only specific groups or classes can access your course</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Settings */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Settings className="h-5 w-5 text-gray-700" />
                          <h3 className="text-md font-medium text-gray-800">Additional Settings</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-800 font-medium">Allow comments</p>
                              <p className="text-sm text-gray-500">Let students comment on your course</p>
                            </div>
                            <Switch
                              checked={publishSettings.allowComments}
                              onCheckedChange={(checked) => handlePublishSettingChange("allowComments", checked)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="schedule">Schedule Publishing</Label>
                            <Input 
                              id="schedule" 
                              type="datetime-local"
                              value={publishSettings.scheduledDate}
                              onChange={(e) => handlePublishSettingChange("scheduledDate", e.target.value)}
                              placeholder="Publish immediately"
                            />
                            <p className="text-xs text-gray-500">Leave empty to publish immediately</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Final Review */}
                {currentStep === "review" && selectedCourseData && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-800">Final Review</h2>
                    <p className="text-gray-600">
                      Review your course details before publishing.
                    </p>
                    
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800">
                      <p className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-emerald-600" />
                        <span>Your course is ready to be published!</span>
                      </p>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-5 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800">Course Summary</h3>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        <div className="px-5 py-4 flex justify-between">
                          <span className="text-gray-500">Title</span>
                          <span className="text-gray-800 font-medium">{selectedCourseData.title}</span>
                        </div>
                        
                        <div className="px-5 py-4 flex justify-between">
                          <span className="text-gray-500">Content</span>
                          <span className="text-gray-800 font-medium">
                            {selectedCourseData.slides} slides
                          </span>
                        </div>
                        
                        <div className="px-5 py-4 flex justify-between">
                          <span className="text-gray-500">Visibility</span>
                          <span className="text-gray-800 font-medium">{publishSettings.visibility}</span>
                        </div>
                        
                        <div className="px-5 py-4 flex justify-between items-start">
                          <span className="text-gray-500">Labels</span>
                          <div className="flex flex-wrap justify-end gap-1.5 max-w-[60%]">
                            {publishSettings.labels.map(labelId => {
                              const label = availableLabels.find(l => l.id === labelId);
                              if (!label) return null;
                              return (
                                <span 
                                  key={label.id}
                                  className="inline-block px-2 py-0.5 text-xs text-white rounded-full"
                                  style={{ backgroundColor: label.color }}
                                >
                                  {label.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="px-5 py-4 flex justify-between">
                          <span className="text-gray-500">Publishing</span>
                          <span className="text-gray-800 font-medium">
                            {publishSettings.scheduledDate ? `Scheduled for ${new Date(publishSettings.scheduledDate).toLocaleString()}` : "Publish immediately"}
                          </span>
                        </div>
                        
                        <div className="px-5 py-4 flex justify-between">
                          <span className="text-gray-500">Comments</span>
                          <span className="text-gray-800 font-medium">{publishSettings.allowComments ? "Enabled" : "Disabled"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Navigation Buttons */}
                <div className="mt-12 pt-6 border-t border-gray-100 flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={goToPreviousStep}
                    disabled={currentStep === steps[0].id}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  {currentStep === "review" ? (
                    <Button 
                      onClick={handlePublishCourse}
                      disabled={isPublishing}
                      className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                    >
                      {isPublishing ? "Publishing..." : "Publish Course"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={goToNextStep}
                      disabled={currentStep === "select" && selectedCourse === null}
                      className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 