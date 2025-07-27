"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Send,
  Sparkles,
  CircleHelp,
  MessageSquare,
  Bot,
  Zap,
  ArrowRight,
  User
} from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { HelpHeader } from "@/components/help-center/HelpHeader"
import { motion } from "framer-motion"
import { FullscreenButton } from "@/components/layout/fullscreen-button"

type Message = {
  type: "user" | "bot"
  content: string
  id: string
}

export default function HelpCenterPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "bot",
      content: "Hi there! I'm your AI assistant for Tutorion. How can I help you today?",
      id: "initial"
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const scrollHeight = messagesContainerRef.current.scrollHeight;
      const height = messagesContainerRef.current.clientHeight;
      const maxScrollTop = scrollHeight - height;
      messagesContainerRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping, scrollToBottom])

  const handleSend = () => {
    if (input.trim()) {
      const userMessage = {
        type: "user" as const,
        content: input,
        id: `user-${Date.now()}`
      }
      setMessages(prev => [...prev, userMessage])
      setInput("")
      setIsTyping(true)

      // Simulate bot response
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [
          ...prev,
          {
            type: "bot" as const,
            content: "Thanks for your question. I'll help you with that. Let me provide some information about this topic...",
            id: `bot-${Date.now()}`
          }
        ])
      }, 2000)
    }
  }

  const handleQuickQuestion = (question: string) => {
    const userMessage = {
      type: "user" as const,
      content: question,
      id: `user-${Date.now()}`
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [
        ...prev,
        {
          type: "bot" as const,
          content: `Here's information about ${question.toLowerCase()}...`,
          id: `bot-${Date.now()}`
        }
      ])
    }, 2000)
  }

  // Typing indicator animation
  const TypingIndicator = () => (
    <div className="flex space-x-1 p-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          className="w-2 h-2 bg-emerald-500 rounded-full"
        />
      ))}
    </div>
  )

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

  return (
    <MainLayout>
      <div className="flex-1 bg-gradient-to-br from-emerald-50 to-white h-[calc(100vh-64px)] overflow-hidden">
        {/* Fullscreen button */}
        <FullscreenButton
          isFullScreen={isFullScreen}
          onToggle={toggleFullScreen}
        />

        <div className="max-w-4xl mx-auto px-8 sm:px-10 lg:px-12 pt-10 sm:pt-12 pb-8 h-full flex flex-col">
          <HelpHeader 
            title="Help Center" 
            description="Get assistance with Tutorion" 
          />

          <div className="flex-1 flex flex-col mt-4 min-h-0">
            {/* Main Chat Area - Expanded to take available space */}
            <Card className="overflow-hidden bg-white rounded-xl shadow-md border border-emerald-100 transition-all hover:shadow-lg flex-1 flex flex-col relative mb-6 h-full">
              {/* Decorative green accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              
              {/* Chat Header */}
              <div className="p-4 border-b border-emerald-100 flex items-center flex-shrink-0 bg-gradient-to-r from-emerald-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                  </div>
                  <div>
                    <h2 className="text-gray-800 font-medium leading-tight">AI Support Assistant</h2>
                    <p className="text-xs text-gray-500">Ask me anything about Tutorion</p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1 bg-emerald-100 px-2.5 py-1.5 rounded-full">
                  <Zap className="h-3 w-3 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">Powered by AI</span>
                </div>
              </div>
              
              {/* Messages Area with improved scrolling */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 pb-20 bg-gradient-to-br from-emerald-50/40 to-white min-h-0 scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#10b981 transparent',
                  scrollBehavior: 'smooth'
                }}
              >
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div 
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg py-2.5 px-4 ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md"
                            : "bg-white text-gray-800 border border-emerald-100 shadow-sm"
                        }`}
                      >
                        {message.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white rounded-lg shadow-sm border border-emerald-100">
                        <TypingIndicator />
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>
              
              {/* Input Area with floating Common Questions directly above */}
              <div className="relative px-4 pt-6 pb-4 border-t border-emerald-100 flex-shrink-0 bg-gradient-to-b from-white to-emerald-50/30 mt-4">
                {/* Floating Common Questions without a box */}
                <div className="absolute -top-10 left-0 w-full flex justify-center gap-2 flex-wrap px-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 py-1 h-auto border-emerald-200 bg-white/80 backdrop-blur-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-gray-700 font-normal rounded-full shadow-sm"
                      onClick={() => handleQuickQuestion("How do I create my first course?")}
                    >
                      <CircleHelp className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      <span className="text-xs">Create a course</span>
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 py-1 h-auto border-emerald-200 bg-white/80 backdrop-blur-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-gray-700 font-normal rounded-full shadow-sm"
                      onClick={() => handleQuickQuestion("What are learning paths?")}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      <span className="text-xs">Learning paths</span>
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 py-1 h-auto border-emerald-200 bg-white/80 backdrop-blur-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-gray-700 font-normal rounded-full shadow-sm"
                      onClick={() => handleQuickQuestion("How do I contact support?")}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      <span className="text-xs">Contact support</span>
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 py-1 h-auto border-emerald-200 bg-white/80 backdrop-blur-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-gray-700 font-normal rounded-full shadow-sm"
                      onClick={() => handleQuickQuestion("Can I publish my courses publicly?")}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      <span className="text-xs">Publish courses</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Improved input bar with fixed send icon */}
                <div className="flex items-center rounded-full border border-emerald-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:shadow-md transition-all overflow-hidden">
                  <div className="flex-1 flex items-center pl-4">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your question here..."
                      className="flex-1 border-0 focus-visible:ring-0 focus-visible:outline-none text-gray-700 bg-transparent py-2.5"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSend();
                        }
                      }}
                    />
                  </div>
                  
                  <Button
                    onClick={handleSend}
                    className="h-8 w-8 p-0 mr-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 mt-2 ml-2">
                  Press Enter to send
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

