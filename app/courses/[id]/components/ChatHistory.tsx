// app/courses/[id]/components/ChatHistory.tsx
'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot } from 'lucide-react'
import { Message } from "../types"

export const ChatHistory = ({ messages, isTyping }: { messages: Message[], isTyping: boolean }) => {
    return (
        <ScrollArea className= "h-[calc(100vh-4rem)] px-4" >
        <div className="space-y-4 py-4" >
        {
            messages.map(message => (
                <div key= { message.id } className = {`flex items-start gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`} >
        {
            message.sender === "ai" ? (
                <Avatar>
                <AvatarImage src= "/ai-avatar.png" alt="AI" />
                <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback >
                    </Avatar>
            ) : (
    <Avatar>
    <AvatarImage src= "/user-avatar.png" alt = "User" />
        <AvatarFallback>U </AvatarFallback>
        </Avatar>
            )}
<div className={ `flex-1 p-3 rounded-lg ${message.sender === "ai" ? "bg-blue-100 dark:bg-blue-900" : "bg-indigo-100 dark:bg-indigo-900"}` }>
    <p className="text-sm text-gray-800 dark:text-gray-200" > { message.text } </p>
        < span className = "text-xs text-gray-500 dark:text-gray-400 mt-1 block" >
            { message.timestamp.toLocaleTimeString() }
            </span>
            </div>
            </div>
        ))}
{
    isTyping && (
        <div className="flex items-start gap-3" >
            <Avatar>
            <AvatarImage src="/ai-avatar.png" alt = "AI" />
                <AvatarFallback><Bot className="h-5 w-5" /> </AvatarFallback>
                    </Avatar>
                    < div className = "flex-1 bg-blue-100 dark:bg-blue-900 p-3 rounded-lg" >
                        <p className="text-sm text-gray-800 dark:text-gray-200" > Typing...</p>
                            </div>
                            </div>
        )
}
</div>
    </ScrollArea>
  )
}