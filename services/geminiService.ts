// Fix: Create the content for the geminiService to handle all AI interactions.
import { GoogleGenerativeAI, Part, GenerativeModel, GenerateContentResponse, SchemaType } from "@google/generative-ai";
// FIX: Import the new AnalyzedTaskData type.
import { DailyBriefing, Note, Priority, Todo, AnalyzedTaskData, ChatMessage } from "../types";

// Helper to create a new AI instance for each request, ensuring the user-provided API key is used.
const getAI = (apiKey: string) => new GoogleGenerativeAI(apiKey);

const taskSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        text: { type: SchemaType.STRING, description: 'The main text or title of the task, summarizing the user request.' },
        priority: { type: SchemaType.STRING, enum: [Priority.High, Priority.Medium], description: 'Priority of the task. Default to medium if not specified. High for urgent tasks.' },
        datetime: { type: SchemaType.STRING, description: 'The specific date and time for the task in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) if mentioned. Otherwise null.', nullable: true },
        category: { type: SchemaType.STRING, description: 'A category for the task (e.g., Work, Personal, Shopping, Appointment).', nullable: true },
        estimatedDuration: { type: SchemaType.NUMBER, description: 'Estimated time in minutes to complete the task.', nullable: true },
        requiresRouting: { type: SchemaType.BOOLEAN, description: 'True if the task involves going to a specific location and requires travel directions.', nullable: true },
        destination: { type: SchemaType.STRING, description: 'The destination address or place name if requiresRouting is true. Otherwise null.', nullable: true },
        isConflict: { type: SchemaType.BOOLEAN, description: 'Set to true ONLY if the user explicitly mentions a time conflict with another task. Otherwise false.', nullable: true },
    },
    required: ['text', 'priority'],
};

const dailyBriefingSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        summary: { type: SchemaType.STRING, description: "A brief, encouraging summary of the day's scheduled tasks." },
        focus: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "A list of 2-3 most important or time-sensitive tasks for the user to focus on." },
        conflicts: { type: SchemaType.STRING, description: "A description of any potential scheduling conflicts, overlapping tasks, or tasks scheduled too close together. If no conflicts, state that the schedule looks good." },
    },
    required: ['summary', 'focus', 'conflicts'],
};

const chatIntentSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        intent: { 
            type: SchemaType.STRING, 
            enum: ['add_task', 'add_note', 'get_summary', 'chat'], 
            description: "Classify the user's intent. 'add_task' for creating an actionable to-do item (e.g., 'buy milk', 'call the doctor'). 'add_note' for saving information or ideas to the daily notepad (e.g., 'remember this idea', 'note this down'). 'get_summary' for asking for a daily briefing. 'chat' for general conversation." 
        },
        description: { 
            type: SchemaType.STRING, 
            description: "If the intent is 'add_task' or 'add_note', this is the full content to be added. Otherwise null.",
            nullable: true
        },
    },
    required: ['intent']
};


function safelyParseJSON<T>(jsonString: string): T | null {
    try {
        const cleanedString = jsonString.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        return JSON.parse(cleanedString) as T;
    } catch (error) {
        console.error("Failed to parse JSON:", error, "Raw string:", jsonString);
        return null;
    }
}

// FIX: Update return type to AnalyzedTaskData for better type safety.
const analyzeTask = async (apiKey: string, description: string): Promise<AnalyzedTaskData | null> => {
    try {
        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const response: GenerateContentResponse = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: `Analyze the following task description and extract its properties. Today's date is ${new Date().toLocaleDateString('en-CA')}. Task: "${description}"` }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: taskSchema as any,
                temperature: 0.2,
            },
        });
        // FIX: Use the specific AnalyzedTaskData type for parsing.
        return safelyParseJSON<AnalyzedTaskData>(response.response.text());
    } catch (error) {
        console.error('Error analyzing task with Gemini:', error);
        return null;
    }
};

// FIX: Update return type to AnalyzedTaskData for better type safety.
const analyzeImageForTask = async (apiKey: string, prompt: string, imageBase64: string, mimeType: string): Promise<AnalyzedTaskData | null> => {
    try {
        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };
        const textPart = {
            text: `Analyze the user's request based on the provided image. Extract task properties from the request and the image content. Today's date is ${new Date().toLocaleDateString('en-CA')}. User request: "${prompt}"`,
        };

        const response: GenerateContentResponse = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [textPart, imagePart]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: taskSchema as any,
            },
        });
        
        // FIX: Use the specific AnalyzedTaskData type for parsing.
        return safelyParseJSON<AnalyzedTaskData>(response.response.text());
    } catch (error) {
        console.error('Error analyzing image for task with Gemini:', error);
        return null;
    }
};

const getDirections = async (apiKey: string, origin: string, destination: string): Promise<string | null> => {
    try {
        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `Provide clear, step-by-step public transport directions from "${origin}" to "${destination}" in Istanbul. Include walking, bus, and metro/metrobüs steps. Be concise.`;
        const response: GenerateContentResponse = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.5,
            }
        });
        return response.response.text();
    } catch (error) {
        console.error('Error getting directions with Gemini:', error);
        return null;
    }
};

const startChat = async (apiKey: string, history: { role: 'user' | 'model'; text: string }[], newMessage: string): Promise<GenerateContentResponse | null> => {
    try {
        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Gemini API requires the first message to have role 'user', not 'model'
        // Filter out any initial model messages from the history
        const filteredHistory = history.filter((msg, index) => {
            // Remove the first message if it's a model message
            if (index === 0 && msg.role === 'model') {
                return false;
            }
            return true;
        });
        
        const chat = model.startChat({
            history: filteredHistory.map(msg => ({ 
                role: msg.role, 
                parts: [{ text: msg.text }] 
            })),
        });

        const response = await chat.sendMessage(newMessage);
        return response;
    } catch (error) {
        console.error('Error in chat with Gemini:', error);
        return null;
    }
};

const getDailyBriefing = async (apiKey: string, todos: { text: string; datetime: string | null }[]): Promise<DailyBriefing | null> => {
    if (todos.length === 0) {
        return {
            summary: "Bugün için planlanmış bir göreviniz yok. Harika bir gün sizi bekliyor!",
            focus: [],
            conflicts: "Herhangi bir çakışma bulunmuyor."
        };
    }
    
    try {
        const taskList = todos.map(t => `- ${t.text} (${t.datetime ? new Date(t.datetime).toLocaleTimeString('tr-TR') : 'zamanlanmamış'})`).join('\n');
        const prompt = `Here are the user's tasks for today (${new Date().toLocaleDateString('tr-TR')}):\n${taskList}\n\nPlease provide a daily briefing based on these tasks. Analyze for conflicts and suggest focus points.`;

        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const response: GenerateContentResponse = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: dailyBriefingSchema as any,
                temperature: 0.7,
            },
        });
        return safelyParseJSON<DailyBriefing>(response.response.text());
    } catch (error) {
        console.error('Error getting daily briefing from Gemini:', error);
        return null;
    }
};

const processNotesWithPrompt = async (apiKey: string, notes: Note[], prompt: string): Promise<string | null> => {
    try {
        const contents: Part[] = [];
        notes.forEach(note => {
            if (note.text) {
                contents.push({ text: `Note: "${note.text}"` });
            }
            if (note.imageUrl) {
                const b64 = note.imageUrl.split(',')[1];
                const mime = note.imageUrl.match(/:(.*?);/)?.[1] || 'image/png';
                contents.push({ inlineData: { data: b64, mimeType: mime } });
            }
        });

        contents.push({ text: `\nUser's Request: "${prompt}"` });

        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const response: GenerateContentResponse = await model.generateContent({
            contents: [{
                role: 'user',
                parts: contents
            }],
            generationConfig: {
                temperature: 0.7,
            }
        });
        return response.response.text();
    } catch (error) {
        console.error('Error processing notes with Gemini:', error);
        return null;
    }
};

const extractTextFromImage = async (apiKey: string, note: Note): Promise<string | null> => {
    if (!note.imageUrl) return null;
    try {
        const b64 = note.imageUrl.split(',')[1];
        const mime = note.imageUrl.match(/:(.*?);/)?.[1] || 'image/png';

        const imagePart = {
            inlineData: {
                data: b64,
                mimeType: mime,
            },
        };
        const textPart = {
            text: "Extract all text from this image. Only return the extracted text.",
        };

        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const response: GenerateContentResponse = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [textPart, imagePart]
            }],
        });
        return response.response.text();
    } catch (error) {
        console.error('Error extracting text from image with Gemini:', error);
        return null;
    }
};

const classifyChatIntent = async (apiKey: string, message: string): Promise<{ intent: string, description?: string } | null> => {
    try {
        const genAI = getAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const response: GenerateContentResponse = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: `Classify the user's intent for the following message. Distinguish between an actionable task ('add_task') and a piece of information to be saved ('add_note'). Message: "${message}"` }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: chatIntentSchema as any,
                temperature: 0.1
            },
        });
        return safelyParseJSON<{ intent: string, description?: string }>(response.response.text());
    } catch (error) {
        console.error('Error classifying chat intent:', error);
        return null;
    }
};

export const geminiService = {
    analyzeTask,
    analyzeImageForTask,
    getDirections,
    startChat,
    getDailyBriefing,
    processNotesWithPrompt,
    extractTextFromImage,
    classifyChatIntent,
};