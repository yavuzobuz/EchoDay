// Fix: Create the content for the geminiService to handle all AI interactions.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
// FIX: Import the new AnalyzedTaskData type.
import { DailyBriefing, Note, Priority, Todo, AnalyzedTaskData, ChatMessage } from "../types";

// Helper to create a new AI instance for each request, ensuring the user-provided API key is used.
const getAI = (apiKey: string) => new GoogleGenerativeAI(apiKey);
const modelName = 'gemini-2.5-pro';

const taskSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        text: { type: SchemaType.STRING, description: 'Görevin tam ve orijinal metni. Kullanıcının söylediği veya yazdığı gibi, çeviri yapılmadan veya özetlenmeden alınmalıdır.' },
        priority: { type: SchemaType.STRING, enum: [Priority.High, Priority.Medium], description: 'Görevin önceliği. Belirtilmemişse varsayılan olarak orta. Acil görevler için yüksek.' },
        datetime: { type: SchemaType.STRING, description: 'Görev için belirtilmişse ISO 8601 formatında (YYYY-AA-GGTHH:dd:ss.sssZ) belirli tarih ve saat. Aksi takdirde null.', nullable: true },
        category: { type: SchemaType.STRING, description: 'Görev için bir kategori (örn: İş, Kişisel, Alışveriş, Randevu).', nullable: true },
        estimatedDuration: { type: SchemaType.NUMBER, description: 'Görevi tamamlamak için tahmini süre (dakika cinsinden).', nullable: true },
        requiresRouting: { type: SchemaType.BOOLEAN, description: 'Görev belirli bir yere gitmeyi içeriyorsa ve yol tarifi gerektiriyorsa true.', nullable: true },
        destination: { type: SchemaType.STRING, description: 'Eğer requiresRouting true ise, hedef adres veya yer adı. Aksi takdirde null.', nullable: true },
        isConflict: { type: SchemaType.BOOLEAN, description: 'SADECE kullanıcı başka bir görevle zaman çakışmasından açıkça bahsederse true olarak ayarla. Aksi takdirde false.', nullable: true },
    },
    required: ['text', 'priority'],
};

const dailyBriefingSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        summary: { type: SchemaType.STRING, description: "Günün planlanmış görevlerinin kısa ve teşvik edici bir özeti." },
        focus: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Kullanıcının odaklanması için en önemli veya zamana duyarlı 2-3 görevin bir listesi." },
        conflicts: { type: SchemaType.STRING, description: "Olası zamanlama çakışmalarının, üst üste binen görevlerin veya çok yakın zamanlanmış görevlerin bir açıklaması. Çakışma yoksa, programın iyi göründüğünü belirtin." },
    },
    required: ['summary', 'focus', 'conflicts'],
};

const chatIntentSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        intent: { 
            type: SchemaType.STRING, 
            enum: ['add_task', 'add_note', 'get_summary', 'chat'], 
            description: "Kullanıcının niyetini sınıflandır. 'add_task' eyleme geçirilebilir bir yapılacak öğesi oluşturmak için ('süt al', 'doktoru ara'). 'add_note' bilgi veya fikirleri günlük not defterine kaydetmek için ('bu fikri hatırla', 'bunu not al'). 'get_summary' günlük bir brifing istemek için. 'chat' genel sohbet için." 
        },
        description: { 
            type: SchemaType.STRING, 
            description: "Eğer niyet 'add_task' veya 'add_note' ise, eklenecek tam içerik budur. Aksi takdirde null.", 
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
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: taskSchema as any,
                temperature: 0.2,
            },
        });
        
        const prompt = `Aşağıdaki görev tanımını analiz et ve özelliklerini çıkar. Özellikle 'text' alanını kullanıcının girdiği orijinal metinle, çeviri yapmadan doldur. Kullanıcının şu anki tarihi ve saati: ${new Date().toISOString()}. 'Yarın saat 3' gibi göreceli zamanları bu bilgiye göre yorumla. Nihai tarihi tam bir ISO 8601 formatında döndür. Görev: "${description}"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // FIX: Use the specific AnalyzedTaskData type for parsing.
        return safelyParseJSON<AnalyzedTaskData>(text);
    } catch (error) {
        console.error('Error analyzing task with Gemini:', error);
        return null;
    }
};

// FIX: Update return type to AnalyzedTaskData for better type safety.
const analyzeImageForTask = async (apiKey: string, prompt: string, imageBase64: string, mimeType: string): Promise<AnalyzedTaskData | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: taskSchema as any,
            },
        });
        
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };
        
        const textPrompt = `Sağlanan resme dayanarak kullanıcının isteğini analiz et. İstekten ve resim içeriğinden görev özelliklerini çıkar. Özellikle 'text' alanını kullanıcının girdiği orijinal metinle, çeviri yapmadan doldur. Kullanıcının şu anki tarihi ve saati: ${new Date().toISOString()}. 'Yarın saat 3' gibi göreceli zamanları bu bilgiye göre yorumla. Nihai tarihi tam bir ISO 8601 formatında döndür. Kullanıcı isteği: "${prompt}"`;
        
        const result = await model.generateContent([textPrompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        // FIX: Use the specific AnalyzedTaskData type for parsing.
        return safelyParseJSON<AnalyzedTaskData>(text);
    } catch (error) {
        console.error('Error analyzing image for task with Gemini:', error);
        return null;
    }
};

const getDirections = async (apiKey: string, origin: string, destination: string): Promise<string | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.5,
            },
        });
        
        const prompt = `"${origin}" konumundan "${destination}" konumuna İstanbul için toplu taşıma kullanarak net, adım adım yol tarifi sağla. Yürüme, otobüs ve metro/metrobüs adımlarını dahil et. Kısa ve öz ol.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error getting directions with Gemini:', error);
        return null;
    }
};

const startChat = async (apiKey: string, history: ChatMessage[], newMessage: string): Promise<{text: string} | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({ model: modelName });
        
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

        const result = await chat.sendMessage(newMessage);
        const response = await result.response;
        return { text: response.text() };
    } catch (error) {
        console.error('Error in chat with Gemini:', error);
        return null;
    }
};

const getDailyBriefing = async (apiKey: string, todos: Todo[]): Promise<DailyBriefing | null> => {
    if (todos.length === 0) {
        return {
            summary: "Bugün için planlanmış bir göreviniz yok. Harika bir gün sizi bekliyor!",
            focus: [],
            conflicts: "Herhangi bir çakışma bulunmuyor."
        };
    }
    
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: dailyBriefingSchema as any,
                temperature: 0.7,
            },
        });
        
        const taskList = todos.map(t => `- ${t.text} (${t.datetime ? new Date(t.datetime).toLocaleTimeString('tr-TR') : 'zamanlanmamış'})`).join('\n');
        const prompt = `Kullanıcının bugünkü (${new Date().toLocaleDateString('tr-TR')}) görevleri şunlardır:\n${taskList}\n\nLütfen bu görevlere dayanarak bir günlük brifing sağlayın. Çakışmaları analiz edin ve odak noktaları önerin.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return safelyParseJSON<DailyBriefing>(text);
    } catch (error) {
        console.error('Error getting daily briefing from Gemini:', error);
        return null;
    }
};

const processNotesWithPrompt = async (apiKey: string, notes: Note[], prompt: string): Promise<string | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
            },
        });
        
        const contents: any[] = [];
        notes.forEach(note => {
            if (note.text) {
                contents.push(`Not: "${note.text}"`);
            }
            if (note.imageUrl) {
                const b64 = note.imageUrl.split(',')[1];
                const mime = note.imageUrl.match(/:(.*?);/)?.[1] || 'image/png';
                contents.push({ inlineData: { data: b64, mimeType: mime } });
            }
        });

        contents.push(`\nKullanıcının İsteği: "${prompt}"`);

        const result = await model.generateContent(contents);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error processing notes with Gemini:', error);
        return null;
    }
};

const extractTextFromImage = async (apiKey: string, note: Note): Promise<string | null> => {
    if (!note.imageUrl) return null;
    try {
        const model = getAI(apiKey).getGenerativeModel({ model: modelName });
        
        const b64 = note.imageUrl.split(',')[1];
        const mime = note.imageUrl.match(/:(.*?);/)?.[1] || 'image/png';

        const imagePart = {
            inlineData: {
                data: b64,
                mimeType: mime,
            },
        };
        
        const textPrompt = "Bu resimdeki tüm metni çıkar. Sadece çıkarılan metni döndür.";

        const result = await model.generateContent([textPrompt, imagePart]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error extracting text from image with Gemini:', error);
        return null;
    }
};

const classifyChatIntent = async (apiKey: string, message: string): Promise<{ intent: string, description?: string } | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: chatIntentSchema as any,
                temperature: 0.1
            },
        });
        
        const prompt = `Aşağıdaki mesaj için kullanıcının niyetini sınıflandır. Eyleme geçirilebilir bir görev ('add_task') ile kaydedilecek bir bilgi ('add_note') arasında ayrım yap. Mesaj: "${message}"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return safelyParseJSON<{ intent: string, description?: string }>(text);
    } catch (error) {
        console.error('Error classifying chat intent:', error);
        return null;
    }
};

// Speech-to-Text for Electron fallback
const speechToText = async (apiKey: string, audioBase64: string, mimeType: string = 'audio/webm'): Promise<string | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.3,
            },
        });
        
        const audioPart = {
            inlineData: {
                data: audioBase64,
                mimeType: mimeType,
            },
        };
        
        const prompt = "Bu ses kaydındaki Türkçe konuşmayı tam olarak metne dönüştür. Sadece söylenenleri yaz, başka birşey ekleme:";
        
        const result = await model.generateContent([prompt, audioPart]);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('Error transcribing audio with Gemini:', error);
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
    speechToText,
};
