"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Vapi from "@vapi-ai/web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const BASE_URL = "http://localhost:5000/api/assistant"; // Flask API base URL

export default function VoiceChat() {
    const params = useParams();
    const dynamicTitle = decodeURIComponent(params.title as string || "");

    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [isCallActive, setIsCallActive] = useState(false);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const vapiRef = useRef<Vapi | null>(null);

    console.log("dynamicTitle", dynamicTitle);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY || "";
            vapiRef.current = new Vapi(apiKey);
            setupVapiListeners();
        }

        // --- Cleanup on unmount or page navigation (best effort).
        return () => {
            if (vapiRef.current) {
                vapiRef.current.stop();
            }
            // If call still active when unmounting, delete assistant
            if (isCallActive && assistantId) {
                deleteAssistant(assistantId);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Optionally: Listen for browser/tab closing or refresh
     * to trigger best-effort deletion.
     */
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            // If a call is active, do a best-effort delete
            if (isCallActive && assistantId) {
                // You can use the Beacon API for a non-blocking request
                // or a synchronous XHR here. E.g.:
                navigator.sendBeacon &&
                    navigator.sendBeacon(`${BASE_URL}/delete`, JSON.stringify({ assistant_id: assistantId }));
                // Or a synchronous fetch/XHR:
                // const xhr = new XMLHttpRequest();
                // xhr.open("POST", `${BASE_URL}/delete`, false /* synchronous */);
                // xhr.setRequestHeader("Content-Type", "application/json");
                // xhr.send(JSON.stringify({ assistant_id: assistantId }));
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [assistantId, isCallActive]);

    const setupVapiListeners = () => {
        if (!vapiRef.current) return;

        vapiRef.current.on("call-start", () => {
            console.log("Call has started");
            setIsCallActive(true);
            setMessages([]); // Clear previous messages
            setTranscript(null);
            setSummary(null);
            setRecordingUrl(null);
        });

        vapiRef.current.on("call-end", async () => {
            console.log("Call has ended");
            setIsCallActive(false);
            await fetchEndOfCallReport();

            // On normal call-end, also delete the assistant from the backend
            if (assistantId) {
                await deleteAssistant(assistantId);
            }
        });

        vapiRef.current.on("message", (message) => {
            console.log("Message from assistant:", message);
            setMessages((prev) => [...prev, { role: "assistant", content: message.text }]);
        });

        vapiRef.current.on("error", (e) => {
            console.error("Vapi error:", e);
        });

        vapiRef.current.on("speech-start", () => {
            console.log("Assistant speech has started.");
        });

        vapiRef.current.on("speech-end", () => {
            console.log("Assistant speech has ended.");
        });
    };

    // Fetch End-of-Call Report when the call ends
    const fetchEndOfCallReport = async () => {
        try {
            const response = await fetch("/api/vapi-end-report"); // Example path to your backend
            if (!response.ok) throw new Error("Failed to fetch end-of-call report");

            const data = await response.json();
            console.log("End-of-Call Report:", data);

            setTranscript(data.message.transcript || "No transcript available");
            setSummary(data.message.summary || "No summary available");
            setRecordingUrl(data.message.recordingUrl || null);

            if (data.message.messages) {
                setMessages((prev) => [
                    ...prev,
                    ...data.message.messages.map((m: any) => ({ role: m.role, content: m.message })),
                ]);
            }
        } catch (error) {
            console.error("Error fetching End-of-Call Report:", error);
        }
    };

    // Create the assistant via Flask
    const createAssistant = async (): Promise<string | null> => {
        try {
            const response = await fetch(`${BASE_URL}/create`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_title: dynamicTitle
                })
            });
            if (!response.ok) throw new Error("Failed to create assistant");

            const data = await response.json();
            console.log("Assistant created:", data);
            setAssistantId(data.assistant_id);
            return data.assistant_id;
        } catch (error) {
            console.error("Error creating assistant:", error);
            return null;
        }
    };

    // Delete the assistant
    const deleteAssistant = async (id: string) => {
        try {
            // If we never actually created an assistant, skip
            if (!id) return;

            const response = await fetch(`${BASE_URL}/delete`, {
                credentials: "include",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assistant_id: id }),
            });

            if (!response.ok) throw new Error("Failed to delete assistant");

            console.log("Assistant deleted successfully");
            setAssistantId(null);
        } catch (error) {
            console.error("Error deleting assistant:", error);
        }
    };

    // Start the call by first creating an assistant
    const startCall = async () => {
        if (!vapiRef.current) return;

        const newAssistantId = await createAssistant();
        if (!newAssistantId) return;

        try {
            // With Vapi Web SDK v2, you can pass just the assistantId
            await vapiRef.current.start(newAssistantId);
            console.log("Call started");
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    // Stop the call - triggers "call-end" event in the VAPI SDK
    const stopCall = () => {
        if (vapiRef.current) {
            vapiRef.current.stop();
            console.log("Call stopped");
            deleteAssistant(assistantId || "").then(r => {
                console.log("Assistant deleted");
            })
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Voice Chat with VAPI AI</CardTitle>
                </CardHeader>
                <CardContent className="h-[60vh] overflow-y-auto">
                    {messages.map((m, index) => (
                        <div key={index} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                            <span
                                className={`inline-block p-2 rounded-lg ${m.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
                                    }`}
                            >
                                {m.content}
                            </span>
                        </div>
                    ))}

                    {transcript && (
                        <div className="mt-4 p-2 bg-gray-200 rounded-lg">
                            <strong>Full Transcript:</strong>
                            <p>{transcript}</p>
                        </div>
                    )}

                    {summary && (
                        <div className="mt-4 p-2 bg-gray-200 rounded-lg">
                            <strong>Summary:</strong>
                            <p>{summary}</p>
                        </div>
                    )}

                    {recordingUrl && (
                        <div className="mt-4">
                            <strong>Recording:</strong>{" "}
                            <a href={recordingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                Listen to the call
                            </a>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center space-x-2">
                    <Button onClick={startCall} disabled={isCallActive}>
                        Start Call
                    </Button>
                    <Button onClick={stopCall} disabled={!isCallActive}>
                        Stop Call
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
} 