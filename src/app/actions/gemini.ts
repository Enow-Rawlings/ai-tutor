"use server";

/**
 * Next.js Server Actions
 * These functions run EXCLUSIVELY on the server.
 * This is where we safely use secret API keys (like the Gemini API key)
 * without exposing them to the browser/client.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini AI client
// Ensure you have GEMINI_API_KEY in your .env.local file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateRoadmapAction({
  path,
  level,
  goals,
}: {
  path: string;
  level: string;
  goals: string[];
}) {
  try {
    // We use gemini-1.5-flash as it's fast and excellent at JSON generation
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are an expert AI educational architect and senior mentor.
      Your task is to generate a highly structured, realistic, and progressive learning roadmap.
      
      User Profile:
      - Learning Path: ${path}
      - Current Skill Level: ${level}
      - Goals: ${goals.join(", ")}
      
      Requirements:
      - Create a logical curriculum divided into 4 to 6 major modules.
      - Each module should progressively build on the last.
      - Return the result STRICTLY as a JSON object with the following schema:
      
      {
        "title": "String - A motivating title for the roadmap",
        "description": "String - A short encouraging summary of the journey",
        "modules": [
          {
            "id": "String - unique identifier like module-1",
            "title": "String - Name of the module",
            "description": "String - What the user will learn",
            "estimatedDays": "Number - Realistic number of days to complete",
            "topics": ["Array of Strings - key concepts covered"]
          }
        ]
      }
      
      Do not include any markdown formatting, just the raw JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON string into a JavaScript object
    const roadmapData = JSON.parse(text);
    return { success: true, data: roadmapData };
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { success: false, error: error.message || "Failed to generate roadmap" };
  }
}

export async function generateDailyLessonAction({
  roadmapTitle,
  moduleTitle,
  dayNumber,
  topics
}: {
  roadmapTitle: string;
  moduleTitle: string;
  dayNumber: number;
  topics: string[];
}) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are an expert AI educational architect and senior mentor.
      Create a highly engaging, practical daily lesson for a student.
      
      Context:
      - Course: ${roadmapTitle}
      - Current Module: ${moduleTitle}
      - Day Number: ${dayNumber}
      - Topics to Cover Today: ${topics.join(", ")}
      
      Requirements:
      - The lesson must be beginner-friendly but practical.
      - Return the result STRICTLY as a JSON object with the following schema:
      
      {
        "title": "String - Catchy title for today's lesson",
        "notes": "String - Comprehensive but readable markdown content teaching the core concepts. Include code snippets or examples if applicable.",
        "exercises": [
          {
            "question": "String - A practical exercise question",
            "difficulty": "String - Easy, Medium, or Hard"
          }
        ],
        "quiz": [
          {
            "question": "String - A multiple-choice question",
            "options": ["Array of Strings - 4 options"],
            "correctAnswerIndex": "Number - 0 to 3"
          }
        ],
        "project": "String - A mini-project description for them to build today.",
        "reflection": "String - A prompt asking them what they learned today."
      }
      
      Do not include any markdown formatting around the JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return { success: true, data: JSON.parse(text) };
    
  } catch (error: any) {
    console.error("Gemini API Error (Daily Lesson):", error);
    return { success: false, error: error.message || "Failed to generate daily lesson" };
  }
}
