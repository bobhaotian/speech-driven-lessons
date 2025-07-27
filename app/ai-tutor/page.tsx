"use client"

import { useState, useRef, useEffect } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: number
  sender: "user" | "ai"
  text: string
  timestamp: Date
}

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I'm your AI tutor. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: inputMessage.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage(""); // Clear input
    setIsTyping(true);

    try {
      // Send message to AI tutor endpoint
      const response = await fetch("http://127.0.0.1:5000/api/aitutor-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userMessage.text }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.text(); // Changed from response.json() since your endpoint returns text directly

      // Add AI response to chat
      const aiMessage: Message = {
        id: Date.now(),
        sender: "ai",
        text: data,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now(),
        sender: "ai",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <MainNav />
      <main className="flex-1 p-8 space-y-6">
        <h1 className="text-3xl font-bold">AI Tutor</h1>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Chat with AI Tutor</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""
                        }`}
                    >
                      {message.sender === "ai" && (
                        <Bot className="w-8 h-8 p-1 rounded-full bg-primary text-primary-foreground" />
                      )}
                      <div
                        className={`flex-1 p-3 rounded-lg ${message.sender === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"
                          }`}
                      >
                        <p>{message.text}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-start gap-3">
                      <Bot className="w-8 h-8 p-1 rounded-full bg-primary text-primary-foreground" />
                      <div className="flex-1 bg-muted p-3 rounded-lg">
                        <p>Typing...</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex items-center gap-2 mt-4">
                <Input
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={isTyping || !inputMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Study Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Take notes during your AI tutoring session..."
                className="min-h-[200px]"
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}