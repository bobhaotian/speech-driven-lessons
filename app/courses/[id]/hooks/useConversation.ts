// app/courses/[id]/hooks/useConversation.ts
'use client'

import { useState, useEffect, useRef } from "react"
import { Message } from "../types"
import { useRouter } from 'next/navigation'
import { useSpeech } from './useSpeech'

export const useConversation = (courseId: string) => {
  const { speakResponse } = useSpeech(async () => null)
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I'm your AI tutor for this course. What would you like to learn today?",
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageRef = useRef("")

  useEffect(() => {
    const initializeChatbot = async () => {
      try {
        const decodedTitle = decodeURIComponent(courseId)
        const response = await fetch("http://localhost:5000/api/initialize-chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ course_title: decodedTitle }),
        })

        if (!response.ok) throw new Error('Failed to initialize chatbot')

        const data = await response.json()
        console.log("Chatbot initialized:", data)
      } catch (error) {
        console.error("Error initializing chatbot:", error)
      }
    }

    initializeChatbot()
  }, [courseId])

  const handleConversationCycle = async (userInput: string): Promise<string | null> => {
    if (!userInput.trim()) return null

    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: "user",
      text: userInput,
      timestamp: new Date()
    }])
    setIsTyping(true)

    let aiMessageId = Date.now()
    let accumulatedText = ""
    let lastSpokenLength = 0

    setMessages(prev => [...prev, {
      id: aiMessageId,
      sender: "ai",
      text: "",
      timestamp: new Date(),
      slides: []
    }])

    try {
      const response = await fetch("http://localhost:5000/api/get-ai-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ input: userInput })
      })

      if (!response.body) throw new Error("No response body received")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const parsedChunks = chunk.trim().split("\n").map(line => JSON.parse(line))

        for (const { text } of parsedChunks) {
          if (text) {
            accumulatedText += text
            setMessages(prev =>
              prev.map(msg => msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg)
            )

            // Speak new content when we have a complete sentence or significant new content
            const newContent = accumulatedText.slice(lastSpokenLength)
            if (newContent.match(/[.!?]+/) || newContent.length > 100) {
              await speakResponse(newContent, true)
              lastSpokenLength = accumulatedText.length
            }
          }
        }
      }

      // Handle any remaining text that hasn't been spoken
      const remainingText = accumulatedText.slice(lastSpokenLength)
      if (remainingText.trim()) {
        await speakResponse(remainingText, true)
      }

      // After streaming is done, request slides
      const slidesResponse = await fetch("http://localhost:5000/api/get-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ input: userInput })
      })

      const slidesData = await slidesResponse.json()

      // Update the AI message with slides if available
      setMessages(prev =>
        prev.map(msg => msg.id === aiMessageId ? { ...msg, slides: slidesData.slides } : msg)
      )

      if (slidesData.slides?.length) setCurrentSlideIndex(0)

      return accumulatedText || "" // Ensure it never returns undefined
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, text: "Sorry, I encountered an error. Please try again." } : msg
      ))
      return null
    } finally {
      setIsTyping(false)
    }
  }


  return {
    messages,
    isTyping,
    handleConversationCycle,
    currentSlideIndex,
    setCurrentSlideIndex
  };

}