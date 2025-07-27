// app/courses/[id]/types.ts
export interface Message {
    id: number
    sender: "user" | "ai"
    text: string
    timestamp: Date
    slides?: { title: string; content: string }[]
}

export interface File {
    id: string
    name: string
    size: string
    type: string
    uploadedAt: string
}

declare global {
    interface Window {
        SpeechRecognition: {
            new(): SpeechRecognition
        }
        webkitSpeechRecognition: {
            new(): SpeechRecognition
        }
    }
}

export interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    maxAlternatives: number
    onend: ((this: SpeechRecognition, ev: Event) => any) | null
    onerror: ((this: SpeechRecognition, ev: Event) => any) | null
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null
    start: () => void
    stop: () => void
    abort: () => void
}

export interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
    resultIndex: number
}

export interface SpeechRecognitionResultList {
    length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
}

export interface SpeechRecognitionResult {
    isFinal: boolean
    length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
}

export interface SpeechRecognitionAlternative {
    confidence: number
    transcript: string
}