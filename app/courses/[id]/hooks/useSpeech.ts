// app/courses/[id]/hooks/useSpeech.ts
'use client'

import { useRef, useState } from "react"
import { SpeechRecognition, SpeechRecognitionEvent } from "../types"

export const useSpeech = (handleConversationCycle: (text: string) => Promise<string | null>) => {
    const [isListening, setIsListening] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)

    const shouldContinuousListenRef = useRef(false)
    const isSpeakingRef = useRef(false)
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<BlobPart[]>([])
    const streamRef = useRef<MediaStream | null>(null)

    const startListening = async () => {
        console.log("Starting listening attempt...")
        console.log("isSpeaking:", isSpeakingRef.current)
        console.log("isListening:", isListening)

        if (isSpeakingRef.current || isListening) {
            console.log("Blocked by guards, returning")
            return
        }

        // Clean up any existing instances
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data)
            }

            mediaRecorder.onstart = () => {
                setIsListening(true)
                console.log(isListening)
                console.log("Recorder has started!!!!!!")
            }

            mediaRecorder.onstop = async () => {
                console.log(isListening)
                console.log("Recorder has ended!!!!!!")
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' })
                const formData = new FormData()
                formData.append('audio', audioBlob)

                try {
                    const recognizeResponse = await fetch('http://localhost:5000/api/recognize-openai', {
                        method: 'POST',
                        credentials: "include",
                        body: formData,
                    })
                    const recognizeData = await recognizeResponse.json()

                    if (recognizeData.text) {
                        const aiResponse = await handleConversationCycle(recognizeData.text)
                        //if (aiResponse) await speakResponse(aiResponse)
                    }
                } finally {
                    stream.getTracks().forEach(track => track.stop())
                    recognitionRef.current = null
                }
            }

            const SpeechRecognitionConstructor = (window.SpeechRecognition || window.webkitSpeechRecognition) as any
            const recognition = new SpeechRecognitionConstructor()
            recognitionRef.current = recognition
            recognition.lang = "en-US"
            recognition.continuous = false
            recognition.interimResults = false

            recognition.onresult = () => {
                if (mediaRecorderRef.current?.state === 'recording') {
                    mediaRecorderRef.current.stop()
                }
            }

            recognition.onstart = () => {
                console.log("Recognition has started!!!!!!")
                setIsListening(true)
                // You can set a flag here if needed
                // e.g., setRecognitionStarted(true)
            }

            recognition.onend = () => {
                console.log("Recognition has stopped!!!!!!!")
                setIsListening(false)
                recognitionRef.current = null
                mediaRecorderRef.current?.stop()
            }

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event)
                setIsListening(false)
                recognitionRef.current = null
            }

            setIsListening(true)
            console.log("Starting recognition and recording")
            recognition.start()
            mediaRecorder.start()

            console.log("Recognition and recording started")



            shouldContinuousListenRef.current = true
        } catch (error) {
            console.error("Microphone access error:", error)
        }
    }

    const stopListening = () => {
        shouldContinuousListenRef.current = false
        recognitionRef.current?.stop()
        mediaRecorderRef.current?.stop()
        streamRef.current?.getTracks().forEach(track => track.stop())
        setIsListening(false)
    }

    const speakResponse = async (text: string, isStreaming: boolean = false) => {
        if (!text || isSpeakingRef.current) return

        isSpeakingRef.current = true
        shouldContinuousListenRef.current = false

        try {
            if (isStreaming) {
                try {
                    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
                    for (const sentence of sentences) {
                        if (!sentence.trim()) continue

                        const audioResponse = await fetch('http://localhost:5000/api/generate-audio', {
                            method: 'POST',
                            credentials: "include",
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: sentence, voice: "en-US-AvaMultilingualNeural" }),
                        })

                        const audioBlob = await audioResponse.blob()
                        const audioUrl = URL.createObjectURL(audioBlob)
                        const audio = new Audio(audioUrl)

                        await new Promise((resolve) => {
                            audio.onended = () => {
                                URL.revokeObjectURL(audioUrl)
                                resolve(null)
                            }
                            audio.play().catch(resolve)  // Handle play() rejection
                        })
                    }
                } finally {
                    console.log("Cleaning up after streaming")
                    isSpeakingRef.current = false
                    shouldContinuousListenRef.current = true
                    // Force cleanup of any existing instances
                    if (recognitionRef.current) {
                        recognitionRef.current.stop()
                        recognitionRef.current = null
                    }
                    if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop())
                        streamRef.current = null
                    }
                    setIsListening(false)
                    // Increase timeout and add logging
                    setTimeout(() => {
                        console.log("Attempting to restart listening")
                        startListening()
                    }, 1000)
                }
            } else {
                const audioResponse = await fetch('http://localhost:5000/api/generate-audio', {
                    method: 'POST',
                    credentials: "include",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice: "en-US-AvaMultilingualNeural" }),
                })

                const audioBlob = await audioResponse.blob()
                const audioUrl = URL.createObjectURL(audioBlob)
                const audio = new Audio(audioUrl)

                audio.onended = () => {
                    isSpeakingRef.current = false
                    URL.revokeObjectURL(audioUrl)
                    shouldContinuousListenRef.current = true
                    setTimeout(() => startListening(), 500)
                }

                await audio.play()
            }
        } catch (error) {
            console.error("Audio generation error:", error)
            isSpeakingRef.current = false
        }
    }

    return {
        isListening,
        isMuted,
        isVideoOff,
        startListening,
        stopListening,
        setIsMuted,
        setIsVideoOff,
        speakResponse
    }
}