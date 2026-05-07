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

const parseJsonResponse = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch (primaryError) {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = raw.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (secondaryError) {
        const message = secondaryError instanceof Error ? secondaryError.message : String(secondaryError);
        throw new Error(`JSON parse failed after recovery attempt: ${message}`);
      }
    }
    throw primaryError;
  }
};

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
    const text = await response.text();
    
    const roadmapData = parseJsonResponse(text);
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
  topics,
  previousLessons
}: {
  roadmapTitle: string;
  moduleTitle: string;
  dayNumber: number;
  topics: string[];
  previousLessons: Array<{ day: number; title?: string; topics?: string[]; notes?: string }>;
}) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const previousContext = previousLessons.length > 0
      ? `
      Previous lessons:
      ${previousLessons.map((lesson) => `- Day ${lesson.day}: ${lesson.title}. Topics: ${lesson.topics?.join(", ") || ""}. Notes: ${lesson.notes || ""}`).join("\n\n")}
      `
      : "";

    const prompt = `
      You are an expert AI educational architect and senior mentor.
      Create a highly engaging, practical daily lesson for a student.
      
      Context:
      - Course: ${roadmapTitle}
      - Current Module: ${moduleTitle}
      - Day Number: ${dayNumber}
      - Topics to Cover Today: ${topics.join(", ")}
      ${previousContext}
      Requirements:
      - The lesson must be beginner-friendly but practical.
      - Begin the notes with a short HTML summary block titled "Lesson Summary".
      - The summary block should include:
          * a one-sentence recap of the previous lesson if any
          * a one-sentence preview of what today’s lesson will cover
      - The notes should be concise, summarized, and less bulky.
      - Use real-world analogies compared to technical analogies.
      - Avoid repeating the exact content from previous lessons. Build directly on earlier concepts.
      - For each topic or subtopic, use bold colored headings in HTML, for example:
          <h3 style="color:#7c3aed; font-weight:bold;">Subtopic Title</h3>
      - For each important sentence the user should remember, highlight it in HTML with a color, for example:
          <strong style="color:#f59e0b;">Important sentence</strong>
      - Use short paragraphs, bullet points, and real examples.
      - Return the result STRICTLY as a JSON object with the following schema:
      {
        "title": "String - Catchy title for today's lesson",
        "notes": "String - HTML content teaching the core concepts with styled headings and highlighted key sentences.",
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
    const text = await response.text();

    const parsed = parseJsonResponse(text);
    return { success: true, data: parsed };
    
  } catch (error: any) {
    console.error("Gemini API Error (Daily Lesson):", error, "raw response:", error?.raw || "<no raw>");
    return { success: false, error: error.message || "Failed to generate daily lesson" };
  }
}
