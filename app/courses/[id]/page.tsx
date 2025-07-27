"use client"

import { useConversation } from "./hooks/useConversation"
import { useSpeech } from "./hooks/useSpeech"
import { SidebarProvider, Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Mic, MicOff, Video, VideoOff, Send, Menu, Subtitles, Bot, ChevronLeft } from "lucide-react"
import { useState } from "react"
import { ChatHistory } from "./components/ChatHistory"
import { SlideViewer } from "./components/SlideViewer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Image from "next/image"
import CameraComponent from "@/components/camera-component"
import Link from "next/link"

export default function CoursePage({ params }: { params: { id: string } }) {
  const { messages, isTyping, handleConversationCycle, currentSlideIndex, setCurrentSlideIndex } = useConversation(
    params.id,
  )

  const { isListening, isMuted, isVideoOff, startListening, stopListening, setIsMuted, setIsVideoOff } =
    useSpeech(handleConversationCycle)

  const [inputMessage, setInputMessage] = useState("")
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)

  const currentAIMessage = messages.filter((m) => m.sender === "ai").slice(-1)[0]

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gradient-to-br from-[#F5F7F3] to-[#E2E8D5] text-[#1B4D3E]">
        {/* Back to Courses Button */}
        <Link
          href="/courses"
          className="absolute top-4 left-4 z-50 flex items-center gap-2 text-[#1B4D3E] hover:text-[#2C5F2D] transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Back to Courses</span>
        </Link>

        <Sidebar
          className={`${isSidebarHidden ? "w-0 overflow-hidden" : "w-96"} transition-all duration-300 ease-in-out border-r border-[#1B4D3E]/20`}
        >
          <SidebarContent className="bg-white/90 backdrop-blur-md h-full">
            <ChatHistory messages={messages} isTyping={isTyping} />
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 p-8 flex flex-col overflow-y-auto space-y-6">
            {/* Video Grid */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="relative overflow-hidden h-[320px] bg-white/90 backdrop-blur-md border-[#1B4D3E]/20">
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#1B4D3E]/80 px-3 py-1.5 rounded-full">
                  <Bot className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">AI Tutor</span>
                </div>
                <Image
                  src="/ai-tutor.jpg"
                  alt="AI Tutor"
                  className="object-cover w-full h-[320px]"
                  width={600}
                  height={320}
                />
              </Card>

              <Card className="relative overflow-hidden h-[320px] bg-white/90 backdrop-blur-md border-[#1B4D3E]/20">
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#1B4D3E]/80 px-3 py-1.5 rounded-full">
                  <span className="text-sm font-medium text-white">You</span>
                </div>
                <CameraComponent isVideoOff={isVideoOff} />
              </Card>
            </div>

            {/* AI Response Card */}
            <Card className="flex-1 bg-white/90 backdrop-blur-md border-[#1B4D3E]/20">
              <CardHeader className="border-b border-[#1B4D3E]/10">
                <CardTitle className="text-xl font-semibold text-[#1B4D3E]">AI Tutor Response</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {currentAIMessage?.slides ? (
                  <SlideViewer
                    slides={currentAIMessage.slides}
                    currentSlideIndex={currentSlideIndex}
                    setCurrentSlideIndex={setCurrentSlideIndex}
                  />
                ) : (
                  <div className="p-6 bg-[#1B4D3E]/5 rounded-xl">
                    <p className="text-lg text-[#1B4D3E] leading-relaxed">
                      {currentAIMessage?.text || "Let's start our lesson! Feel free to ask any questions."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-between gap-4 bg-white/95 backdrop-blur-md border-t border-[#1B4D3E]/20 p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-10 w-10 border-[#1B4D3E]/20 hover:bg-[#1B4D3E]/5 hover:text-[#1B4D3E]"
                      onClick={() => (isListening ? stopListening() : startListening())}
                    >
                      {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isListening ? "Stop Listening" : "Start Listening"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-10 w-10 border-[#1B4D3E]/20 hover:bg-[#1B4D3E]/5 hover:text-[#1B4D3E]"
                      onClick={() => setIsVideoOff(!isVideoOff)}
                    >
                      {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isVideoOff ? "Turn Video On" : "Turn Video Off"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-10 w-10 border-[#1B4D3E]/20 hover:bg-[#1B4D3E]/5 hover:text-[#1B4D3E]"
                    >
                      <Subtitles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Subtitles</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-3xl mx-auto">
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleConversationCycle(inputMessage)
                    setInputMessage("")
                  }
                }}
                className="flex-1 bg-white border-[#1B4D3E]/20 focus:border-[#1B4D3E] focus:ring-[#1B4D3E] placeholder-[#1B4D3E]/40"
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={() => {
                        handleConversationCycle(inputMessage)
                        setInputMessage("")
                      }}
                      disabled={isTyping || !inputMessage.trim()}
                      className="rounded-full h-10 w-10 bg-[#1B4D3E] hover:bg-[#2C5F2D] text-white"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-10 w-10 border-[#1B4D3E]/20 hover:bg-[#1B4D3E]/5 hover:text-[#1B4D3E]"
                    onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSidebarHidden ? "Show Chat History" : "Hide Chat History"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

