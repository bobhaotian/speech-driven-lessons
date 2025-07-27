from flask import Flask, request, jsonify, Response, send_file, Blueprint
import openai
import os
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, MessagesState, StateGraph
from langchain_core.messages import HumanMessage, AIMessage


aitutor_bp = Blueprint('aitutor', __name__)

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Define a new LangChain graph
workflow = StateGraph(state_schema=MessagesState)

# Define the function that calls the OpenAI model
def call_model(state: MessagesState):
    try:
        # Prepare system message and state messages for the conversation
        system_message = {
            "role": "system",
            "content": '''You are a helpful AI assistant for the AI Tutor platform 'Tutorion'. Students will ask you some questions after or before their online courses. 
            Make sure your response is concise and to the point, don't be too formal and don't be too long. 
            --- 
            Some of our information: your role is to help students with their online courses. Go to courses tab if they want to add their customized courses, modify their courses or go and start their classes.
            Go to schedule tab if they want to see their schedule.
            Go to profile tab if they want to see their profile.
            Go to progress tab if they want to see their customized courses related data.
            '''
        }
        
        # Add system message at the beginning of the conversation
        messages = [system_message] + [{"role": "user", "content": msg.content} for msg in state["messages"]]

        # Call OpenAI model
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=400,
            temperature=0.9
        )

        # Extract AI's response
        ai_content = response.choices[0].message.content

        # Return the messages including the AI response
        return {"messages": [AIMessage(ai_content)]}
    except Exception as e:
        print(f"Error in call_model: {str(e)}")
        return {"messages": [AIMessage("An error occurred while processing your request.")]}

# Define the (single) node in the graph
workflow.add_edge(START, "model")
workflow.add_node("model", call_model)

# Add memory
memory = MemorySaver()
app_workflow = workflow.compile(checkpointer=memory)

# API Endpoint for handling user input
@aitutor_bp.route('/api/aitutor-response', methods=['POST'])
def get_ai_response():
    try:
        data = request.get_json()
        if not data:
            return {'error': 'No data provided'}, 400
            
        user_input = data.get('input')
        thread_id = data.get('thread_id', 'default_thread')  # Support multiple threads by using a thread ID
        if not user_input:
            return {'error': 'No input provided'}, 400

        # Create HumanMessage for user input
        input_messages = [HumanMessage(user_input)]
        config = {"configurable": {"thread_id": thread_id}}

        # Invoke the LangChain workflow
        output = app_workflow.invoke({"messages": input_messages}, config)
        
        # Get the AI's latest response
        ai_response = output["messages"][-1].content

        return ai_response
        #return {'response': ai_response}
    except Exception as e:
        print(f"Error in get_ai_response: {str(e)}")
        return {'error': str(e)}, 500 