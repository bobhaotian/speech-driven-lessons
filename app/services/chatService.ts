// app/services/chatService.ts
export const initializeChatbot = async (courseTitle: string) => {
    const response = await fetch("http://localhost:5000/api/initialize-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_title: courseTitle }),
    });
    return response.json();
};

export const getAIResponse = async (input: string) => {
    // API call implementation
};
