// Fix: Create the content for the geminiService to handle all AI interactions.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
// FIX: Import the new AnalyzedTaskData type.
import { DailyBriefing, Note, Priority, Todo, AnalyzedTaskData, ChatMessage, ComplexCommandResult, TaskDependency, UserContext, ImageAnalysisResult } from "../types";

// Helper to create a new AI instance for each request, ensuring the user-provided API key is used.
const getAI = (apiKey: string) => new GoogleGenerativeAI(apiKey);
// Using gemini-2.0-flash for higher rate limits (200 RPD vs 100 RPD for 2.5-pro)
const modelName = 'gemini-2.0-flash';

const taskSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        text: { type: SchemaType.STRING, description: 'Görevin tam ve orijinal metni. Kullanıcının söylediği veya yazdığı gibi, çeviri yapılmadan veya özetlenmeden alınmalıdır.' },
        priority: { type: SchemaType.STRING, enum: [Priority.High, Priority.Medium], description: 'Görevin önceliği. Belirtilmemişse varsayılan olarak orta. Acil görevler için yüksek.' },
        datetime: { 
            type: SchemaType.STRING, 
            description: 'SADECE kesin tarih/saat varsa ISO 8601 UTC formatında (YYYY-MM-DDTHH:mm:ss.000Z). Belirsiz süreler için ("yarın", "gelecek hafta", "iki hafta içinde") MUTLAKA null döndür. ASLA doğal dil metni kullanma.', 
            nullable: true 
        },
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

const complexCommandSchema = {
    type: SchemaType.OBJECT as SchemaType.OBJECT,
    properties: {
        tasks: {
            type: SchemaType.ARRAY,
            items: taskSchema,
            description: "Komuttan çıkarılan görevlerin listesi."
        },
        dependencies: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    taskIndex: { type: SchemaType.NUMBER, description: "Bağımlı görevin tasks dizisindeki indexi" },
                    dependsOnIndex: { type: SchemaType.NUMBER, description: "Bağımlı olduğu görevin tasks dizisindeki indexi" },
                    dependencyType: { type: SchemaType.STRING, enum: ['before', 'after', 'parallel'], description: "Bağımlılık tipi" },
                    description: { type: SchemaType.STRING, description: "Bağımlılığın açıklaması", nullable: true }
                },
                required: ['taskIndex', 'dependsOnIndex', 'dependencyType']
            },
            description: "Görevler arasındaki bağımlılıklar."
        },
        suggestedOrder: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
            description: "Önerilen görev yapılma sırası (task index'leri)."
        }
    },
    required: ['tasks', 'dependencies', 'suggestedOrder']
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
        
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
        const now = new Date();
        const nowISO = now.toISOString(); // UTC
        const nowLocal = now.toLocaleString('tr-TR', { hour12: false, timeZone: tz });
        const offsetMinutes = -now.getTimezoneOffset();
        const offsetHours = (offsetMinutes / 60).toFixed(1).replace(/\.0$/, '');
        const prompt = `Aşağıdaki görev tanımını analiz et ve özelliklerini çıkar. Özellikle 'text' alanını kullanıcının girdiği orijinal metinle, çeviri yapmadan doldur.

ÖNEMLİ - SAAT DİLİMİ BİLGİSİ:
- Kullanıcının yerel saat dilimi: ${tz} (UTC${Number(offsetHours) >= 0 ? '+' : ''}${offsetHours})
- Kullanıcının ŞU ANKİ yerel tarihi ve saati: ${nowLocal}
- ŞU ANIN UTC zamanı (referans için): ${nowISO}

ZAMAN DÖNÜŞTÜRMESİ KURALLARI:
1. Eğer görevde BELİRLİ bir tarih ve saat varsa ("yarın saat 15:00", "28 Ekim saat 14:30"), bu zamanı KULLANICININ YEREL SAAT DİLİMİNDE (${tz}) yorumla
2. Yerel zamanı UTC'ye çevir: Yerel zamandan ${offsetHours} saat ÇIKARın
3. Sonucu ISO 8601 UTC formatında döndür: YYYY-MM-DDTHH:mm:00.000Z
4. Örnek: Kullanıcı "yarın saat 15:00" derse ve yarın 2025-10-07 ise:
   - Yerel zaman: 2025-10-07T15:00:00 (${tz})
   - UTC'ye çevrilmiş: 2025-10-07T12:00:00.000Z (15 - 3 = 12)
5. KRİTİK: Eğer kesin tarih/saat belirtilmemişse ("gelecek hafta", "iki hafta içinde", "yakında"), datetime alanını null olarak bırak
6. KRİTİK: ASLA datetime alanına doğal dil metni yazma ("iki hafta içinde", "İki hafta içinde" gibi). Sadece ISO formatı veya null kullan

TEXT ALANI FORMATLAMA:
- Eğer görevde belirli bir tarih varsa (örn: duruşma, fatura ödemesi vb.), text alanında TARİHİ de BELİRT.
- Örnek: "Duruşmaya Katıl" yerine "Duruşmaya Katıl - 15 Ocak 2025 Saat 14:30"
- Örnek: "Elektrik faturası ödemesi" yerine "Elektrik faturası ödemesi - Son Ödeme: 20 Ocak 2025"
- Kategori "Duruşma", "Mahkeme", "Ödeme" veya "Fatura" ise mutlaka tarihi text'e ekle.

Görev: "${description}"`
        
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
        
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
        const now = new Date();
        const nowISO = now.toISOString(); // UTC
        const nowLocal = now.toLocaleString('tr-TR', { hour12: false, timeZone: tz });
        const offsetMinutes = -now.getTimezoneOffset();
        const offsetHours = (offsetMinutes / 60).toFixed(1).replace(/\.0$/, '');
        const textPrompt = `Sağlanan resme dayanarak kullanıcının isteğini analiz et. İstekten ve resim içeriğinden görev özelliklerini çıkar. Özellikle 'text' alanını kullanıcının girdiği orijinal metinle, çeviri yapmadan doldur.

ÖNEMLİ - SAAT DİLİMİ BİLGİSİ:
- Kullanıcının yerel saat dilimi: ${tz} (UTC${Number(offsetHours) >= 0 ? '+' : ''}${offsetHours})
- Kullanıcının ŞU ANKİ yerel tarihi ve saati: ${nowLocal}
- ŞU ANIN UTC zamanı (referans için): ${nowISO}

ZAMAN DÖNÜŞTÜRMESİ KURALLARI:
1. Eğer görevde BELİRLİ bir tarih ve saat varsa ("yarın saat 15:00", "28 Ekim saat 14:30"), bu zamanı KULLANICININ YEREL SAAT DİLİMİNDE (${tz}) yorumla
2. Yerel zamanı UTC'ye çevir: Yerel zamandan ${offsetHours} saat ÇIKARın
3. Sonucu ISO 8601 UTC formatında döndür: YYYY-MM-DDTHH:mm:00.000Z
4. Örnek: Kullanıcı "yarın saat 15:00" derse ve yarın 2025-10-07 ise:
   - Yerel zaman: 2025-10-07T15:00:00 (${tz})
   - UTC'ye çevrilmiş: 2025-10-07T12:00:00.000Z (15 - 3 = 12)
5. KRİTİK: Eğer kesin tarih/saat belirtilmemişse ("gelecek hafta", "iki hafta içinde", "yakında"), datetime alanını null olarak bırak
6. KRİTİK: ASLA datetime alanına doğal dil metni yazma ("iki hafta içinde", "İki hafta içinde" gibi). Sadece ISO formatı veya null kullan

TEXT ALANI FORMATLAMA:
- Eğer görevde belirli bir tarih varsa (örn: duruşma, fatura ödemesi vb.), text alanında TARİHİ de BELİRT.
- Örnek: "Duruşmaya Katıl" yerine "Duruşmaya Katıl - 15 Ocak 2025 Saat 14:30"
- Örnek: "Elektrik faturası ödemesi" yerine "Elektrik faturası ödemesi - Son Ödeme: 20 Ocak 2025"
- Kategori "Duruşma", "Mahkeme", "Ödeme" veya "Fatura" ise mutlaka tarihi text'e ekle.

Kullanıcı isteği: "${prompt}"`
        
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

// ==================== ADVANCED NLP - TASK DEPENDENCIES ====================

/**
 * Karmaşık komutları analiz ederek birden fazla görev ve bağımlılıklarını tespit et
 * Örnek: "Yarın sabah 9'da doktora gitmeden önce eczaneye uğra"
 */
const parseComplexCommand = async (apiKey: string, command: string, userContext?: UserContext): Promise<ComplexCommandResult | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: complexCommandSchema as any,
                temperature: 0.2,
            },
        });
        
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
        const now = new Date();
        const nowISO = now.toISOString();
        const nowLocal = now.toLocaleString('tr-TR', { hour12: false, timeZone: tz });
        const offsetMinutes = -now.getTimezoneOffset();
        const offsetHours = (offsetMinutes / 60).toFixed(1).replace(/\.0$/, '');
        
        let contextInfo = '';
        if (userContext) {
            contextInfo = `\n\nKullanıcı Bağlamı:
- Çalışma Saatleri: ${userContext.workingHours.weekdayStart} - ${userContext.workingHours.weekdayEnd}
- Favori Kategoriler: ${userContext.preferences.favoriteCategories.join(', ')}
- Ortalama Günlük Görev: ${userContext.preferences.averageTasksPerDay.toFixed(1)}`;
        }
        
        const prompt = `Aşağıdaki komutu analiz et ve içerdiği tüm görevleri ve bağımlılıkları tespit et.

Kullanıcının yerel saat dilimi: ${tz} (UTC${Number(offsetHours) >= 0 ? '+' : ''}${offsetHours}).
Kullanıcının şu anki tarihi ve saati (yerel): ${nowLocal}.
Referans için şu anın UTC zamanı: ${nowISO}.${contextInfo}

BAĞLACÇLARA DİKKAT ET:
- "önce" / "evvel" / "-den önce" → before bağımlılığı
- "sonra" / "ardından" / "-den sonra" → after bağımlılığı
- "aynı anda" / "birlikte" / "paralel" → parallel bağımlılığı

Komut: "${command}"

Tüm görevleri çıkar, bağımlılıkları belirle ve optimal sıralamayı öner.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const parsed = safelyParseJSON<any>(text);
        if (!parsed) return null;
        
        return {
            tasks: parsed.tasks || [],
            dependencies: parsed.dependencies.map((dep: any) => ({
                taskId: '', // Will be filled after task creation
                dependsOn: [],
                dependencyType: dep.dependencyType,
                description: dep.description
            })) || [],
            suggestedOrder: parsed.suggestedOrder || []
        };
    } catch (error) {
        console.error('Error parsing complex command:', error);
        return null;
    }
};

/**
 * Mevcut görevler arasındaki bağımlılıkları tespit et
 */
const detectTaskDependencies = async (apiKey: string, newTask: Todo, existingTasks: Todo[], userContext?: UserContext): Promise<TaskDependency[]> => {
    if (existingTasks.length === 0) return [];
    
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.3,
            },
        });
        
        const taskList = existingTasks
            .filter(t => !t.completed)
            .slice(0, 10) // Son 10 tamamlanmamış görevi incele
            .map((t, i) => `${i}. ${t.text} (${t.datetime ? new Date(t.datetime).toLocaleString('tr-TR') : 'zamanlanmamış'})`)
            .join('\n');
        
        let contextInfo = '';
        if (userContext && userContext.patterns.length > 0) {
            const patterns = userContext.patterns.slice(0, 3).map(p => p.pattern).join(', ');
            contextInfo = `\nKullanıcının sık yaptığı görevler: ${patterns}`;
        }
        
        const prompt = `Yeni Görev: "${newTask.text}"${newTask.datetime ? ` (${new Date(newTask.datetime).toLocaleString('tr-TR')})` : ''}

Mevcut Görevler:
${taskList}${contextInfo}

Yeni görev ile mevcut görevler arasında bağımlılık var mı? Örnekler:
- Yeni görev başka bir görevden önce yapılmalı mı?
- Başka bir görev tamamlanmadan yapılamaz mı?
- Hangi görevler birlikte yapılabilir?

Eğer bağımlılık varsa, JSON formatında [{{"taskIndex": 0, "type": "before", "reason": "açıklama"}}] şeklinde yanıt ver.
Eğer bağımlılık yoksa, boş array [] döndür.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // JSON parse
        const dependencies = safelyParseJSON<any[]>(text) || [];
        
        return dependencies.map(dep => ({
            taskId: newTask.id,
            dependsOn: dep.taskIndex !== undefined ? [existingTasks[dep.taskIndex]?.id] : [],
            dependencyType: dep.type || 'before',
            description: dep.reason
        }));
    } catch (error) {
        console.error('Error detecting task dependencies:', error);
        return [];
    }
};

/**
 * Bağlamsal bilgilerle görev analizini geliştir
 */
const analyzeTaskWithContext = async (apiKey: string, description: string, userContext: UserContext): Promise<AnalyzedTaskData | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: taskSchema as any,
                temperature: 0.2,
            },
        });
        
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
        const now = new Date();
        const nowISO = now.toISOString();
        const nowLocal = now.toLocaleString('tr-TR', { hour12: false, timeZone: tz });
        const offsetMinutes = -now.getTimezoneOffset();
        const offsetHours = (offsetMinutes / 60).toFixed(1).replace(/\.0$/, '');
        
        // Pattern eşleşmesi kontrol et
        let patternInfo = '';
        const matchingPattern = userContext.patterns.find(p => 
            description.toLowerCase().includes(p.pattern.toLowerCase()) ||
            p.pattern.toLowerCase().includes(description.toLowerCase())
        );
        
        if (matchingPattern && matchingPattern.timeOfDay) {
            patternInfo = `\n\nÖNEMLİ: Bu görev kullanıcının bilinen bir pattern'i ile eşleşiyor.
Genellikle ${matchingPattern.dayOfWeek !== undefined ? ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][matchingPattern.dayOfWeek] + ' günleri' : ''} saat ${matchingPattern.timeOfDay} civarında yapılıyor.
Eğer zaman belirtilmemişse, bu zamanı öner.`;
        }
        
        const contextInfo = `
Kullanıcı Profili:
- Çalışma Saatleri: ${userContext.workingHours.weekdayStart} - ${userContext.workingHours.weekdayEnd}
- En Üretken Saatler: ${userContext.workingHours.mostProductiveHours.slice(0, 2).join(', ')}
- Favori Kategoriler: ${userContext.preferences.favoriteCategories.slice(0, 3).join(', ') || 'Henüz yok'}
- Ortalama Günlük Görev: ${userContext.preferences.averageTasksPerDay.toFixed(1)}
- Tamamlama Oranı: %${(userContext.completionStats.completionRate * 100).toFixed(0)}${patternInfo}`;
        
        const prompt = `Aşağıdaki görev tanımını kullanıcı bağlamını dikkate alarak analiz et.

Kullanıcının yerel saat dilimi: ${tz} (UTC${Number(offsetHours) >= 0 ? '+' : ''}${offsetHours}).
Kullanıcının şu anki tarihi ve saati (yerel): ${nowLocal}.
Referans için şu anın UTC zamanı: ${nowISO}.${contextInfo}

Görev: "${description}"

Kullanıcının alışkanlıklarını ve tercihleri dikkate al. Eğer pattern eşleşmesi varsa, o pattern'in tipik zamanını kullan.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return safelyParseJSON<AnalyzedTaskData>(text);
    } catch (error) {
        console.error('Error analyzing task with context:', error);
        return null;
    }
};

// ==================== MULTIMODAL ENHANCEMENTS ====================

/**
 * Gelişmiş görsel analiz - Resim tipini tespit et ve içeriği analiz et
 */
const analyzeImageAdvanced = async (apiKey: string, imageBase64: string, mimeType: string): Promise<ImageAnalysisResult | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.3,
            },
        });
        
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };
        
        const prompt = `Bu resmi analiz et ve aşağıdaki bilgileri JSON formatında döndür:
{
  "type": "calendar" | "invoice" | "handwriting" | "screenshot" | "document" | "other",
  "extractedText": "resimdeki tüm metin",
  "detectedDates": ["2025-01-15", "2025-01-20"],
  "detectedNumbers": [{"value": 150, "context": "Tutar"}, {"value": 3, "context": "Adet"}],
  "confidence": 0.95,
  "metadata": {
    "language": "tr",
    "quality": "high"
  }
}

RESMİ TİPLERİ:
- calendar: Takvim, randevu, tarih içeren resimler
- invoice: Fatura, makbuz, ödeme belgesi
- handwriting: El yazısı
- screenshot: Ekran görüntüsü
- document: Basılı belge, form
- other: Diğer

Eğer resimde tarih varsa ("15 Ocak", "20/01/2025" vb.), ISO formatında detectedDates'e ekle.
Eğer sayılar varsa (fiyat, miktar vb.), detectedNumbers'a ekle.
confidence: 0-1 arası güven skoru.`;
        
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        return safelyParseJSON<ImageAnalysisResult>(text);
    } catch (error) {
        console.error('Error analyzing image (advanced):', error);
        return null;
    }
};

/**
 * Takvim/Randevu resminden görevler çıkar
 */
const extractTasksFromCalendarImage = async (apiKey: string, imageBase64: string, mimeType: string): Promise<AnalyzedTaskData[]> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.2,
            },
        });
        
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };
        
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
        const now = new Date();
        const nowISO = now.toISOString();
        const nowLocal = now.toLocaleString('tr-TR', { hour12: false, timeZone: tz });
        
        const prompt = `Bu takvim/randevu resmini analiz et ve tüm randevuları/etkinlikleri JSON array olarak döndür.

Kullanıcının yerel saat dilimi: ${tz}
Kullanıcının şu anki tarihi ve saati: ${nowLocal}
Referans için şu anın UTC zamanı: ${nowISO}

Her randevu/etkinlik için:
[
  {
    "text": "Randevu/etkinlik adı - TARİH VE SAAT BİLGİSİ DAHİL",
    "priority": "high" | "medium",
    "datetime": "ISO 8601 UTC formatında tarih-saat",
    "category": "Randevu",
    "estimatedDuration": dakika cinsinden süre,
    "requiresRouting": true/false,
    "destination": "konum varsa"
  }
]

ÖNEMLİ: text alanında randevunun TARİH ve SAATİNİ mutlaka belirt.
Örnek: "Diş Doktoru Randevusu - 15 Ocak 2025 Saat 14:30"

Sadece JSON array döndür, başka birşey yazma.`
        
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        const tasks = safelyParseJSON<AnalyzedTaskData[]>(text);
        return tasks || [];
    } catch (error) {
        console.error('Error extracting tasks from calendar image:', error);
        return [];
    }
};

/**
 * Fatura resminden ödeme görevi oluştur
 */
const createTaskFromInvoice = async (apiKey: string, imageBase64: string, mimeType: string): Promise<AnalyzedTaskData | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: taskSchema as any,
                temperature: 0.2,
            },
        });
        
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };
        
        const prompt = `Bu fatura/makbuz resmini analiz et ve ödeme görevi oluştur.

Faturadan çıkaracakların:
- Firma adı
- Tutar
- Son ödeme tarihi
- Fatura numarası (varsa)

Görev metnini şöyle oluştur: "[Firma adı] - [Tutar] TL fatura ödemesi - Son Ödeme: [Tarih]"
Örnek: "Elektrik Faturası - 350 TL - Son Ödeme: 20 Ocak 2025"

ÖNEMLİ: Son ödeme tarihi varsa MUTLAKA text alanına ekle!

Son ödeme tarihi varsa datetime'a ekle.
Kategori: "Ödeme" veya "Fatura"
Priority: Tarihe yakınsa "high", değilse "medium"`
        
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        return safelyParseJSON<AnalyzedTaskData>(text);
    } catch (error) {
        console.error('Error creating task from invoice:', error);
        return null;
    }
};

/**
 * El yazısı notlarını dijitalleştir
 */
const digitizeHandwriting = async (apiKey: string, imageBase64: string, mimeType: string): Promise<string | null> => {
    try {
        const model = getAI(apiKey).getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.2,
            },
        });
        
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };
        
        const prompt = `Bu resimdeki el yazısı notları dikkatle oku ve olduğu gibi metne dönüştür.

ÖNEMLİ:
- Her satırı ayrı satıra yaz
- Madde işaretlerini ve numaralandırmaları koru
- Yalnızca okuduğun metni yaz, yorum yapma
- Belirsiz kelimeler için [?] kullan

Sadece metni döndür, başka birşey ekleme.`;
        
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error digitizing handwriting:', error);
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
    } catch (error: any) {
        // Check if it's a rate limit error
        if (error?.message?.includes('quota') || error?.message?.includes('429')) {
            console.warn('Gemini API rate limit exceeded. Speech recognition unavailable temporarily.');
            // Return a user-friendly message instead of null
            throw new Error('API_QUOTA_EXCEEDED');
        }
        console.error('Error transcribing audio with Gemini:', error);
        return null;
    }
};

/**
 * PDF Belgesi Analizi - Görev ve not çıkarma
 */
interface PdfAnalysisResult {
  summary: string;
  documentType: string;
  suggestedTasks: Array<{
    title: string;
    description?: string;
    dueDate?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any> | string;
  }>;
  suggestedNotes: Array<{
    title: string;
    content: string;
    tags?: string[];
  }>;
  entities: {
    dates?: string[];
    people?: string[];
    organizations?: string[];
    locations?: string[];
    amounts?: string[];
  };
}

const analyzePdfDocument = async (
  apiKey: string,
  base64Data: string,
  _fileName: string,
  userPrompt?: string
): Promise<PdfAnalysisResult | null> => {
  try {
    const pdfAnalysisSchema = {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING },
        documentType: { type: SchemaType.STRING },
        suggestedTasks: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING, nullable: true },
              dueDate: { type: SchemaType.STRING, nullable: true },
              category: { type: SchemaType.STRING, nullable: true },
              priority: { type: SchemaType.STRING, enum: ['low', 'medium', 'high'] },
              // Use STRING to allow arbitrary JSON serialized metadata. OBJECT with empty properties is rejected by the API.
              metadata: { type: SchemaType.STRING, nullable: true },
            },
            required: ['title', 'priority']
          }
        },
        suggestedNotes: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              content: { type: SchemaType.STRING },
              tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
            },
            required: ['title', 'content']
          }
        },
        entities: {
          type: SchemaType.OBJECT,
          properties: {
            dates: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
            people: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
            organizations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
            locations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
            amounts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
          }
        },
      },
      required: ['summary', 'documentType', 'suggestedTasks', 'suggestedNotes', 'entities']
    };

    const model = getAI(apiKey).getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1, // Düşük temperature daha tutarlı dil kullanımı için
        responseMimeType: 'application/json',
        responseSchema: pdfAnalysisSchema as any,
      },
      systemInstruction: 'You are a multilingual document analyzer. CRITICAL RULE: Always respond in the SAME LANGUAGE as the input document. Never translate. If the PDF is in Turkish, respond in Turkish. If it is in English, respond in English. Preserve the original language at all times.',
    });

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
    const now = new Date();
    const nowISO = now.toISOString();
    const nowLocal = now.toLocaleString('tr-TR', { hour12: false, timeZone: tz });
    const offsetMinutes = -now.getTimezoneOffset();
    const offsetHours = (offsetMinutes / 60).toFixed(1).replace(/\.0$/, '');

    const prompt = userPrompt || `‼️ ABSOLUTE RULE - LANGUAGE PRESERVATION ‼️
You MUST respond in the EXACT SAME LANGUAGE as the PDF document.
- If PDF is in TURKISH → ALL output in TURKISH (title, description, content, summary)
- If PDF is in ENGLISH → ALL output in ENGLISH
- If PDF is in GERMAN → ALL output in GERMAN
DO NOT TRANSLATE. DO NOT MIX LANGUAGES. USE ONLY THE PDF'S ORIGINAL LANGUAGE.

This is the #1 priority rule. Analyze this PDF document and extract important information.

=== TURKISH VERSION (if PDF is Turkish) ===
Bu PDF belgesini analiz et ve önemli bilgileri çıkar. SADECE JSON FORMATINDA YANIT VER.

**MUTLAK KURAL - DİL:**
- PDF Türkçe ise TÜM çıktı (title, description, content, summary) TÜRKÇE olmalı
- İngilizceye ÇEVİRME, orijinal Türkçe metni kullan
- Kelime kelime aynı dilde yanıt ver

**ZAMAN BİLGİSİ:**
- Kullanıcının yerel saat dilimi: ${tz} (UTC${Number(offsetHours) >= 0 ? '+' : ''}${offsetHours})
- Kullanıcının şu anki tarihi ve saati: ${nowLocal}
- Referans için şu anın UTC zamanı: ${nowISO}

**ANALİZ KURALLARI:**
1. **Belge Türünü Tespit Et**: (court_document, invoice, report, contract, memo, meeting_notes, academic, other)
2. **Önemli Tarih ve Saatleri Çıkar**: Belgedeki tüm tarih/saatleri tespit et
3. **Kişi ve Kurumları Belirle**: Belgedeki önemli isimler
4. **Eylemli Görevler**: Kullanıcının yapması gereken işleri tespit et
5. **Önemli Bilgiler**: Not olarak kaydedilmesi gereken kritik bilgiler

**GÖREV METNİ FORMATLAMA:**
- Görev başlığında (title) MUTLAKA tarihi belirt
- Duruşma: "Duruşmaya katıl - [Tarih] Saat [Saat]"
- Fatura: "[Firma] faturası ödemesi - Son Ödeme: [Tarih]"
- Randevu: "[Randevu türü] - [Tarih] Saat [Saat]"
- Toplantı: "[Toplantı adı] - [Tarih] Saat [Saat]"

**ZAMAN DÖNÜŞTÜRMESİ:**
- Belgedeki tarihleri kullanıcının yerel saatinde yorumla
- ISO 8601 UTC formatına çevir: YYYY-MM-DDTHH:mm:00.000Z
- Örnek: "15 Kasım 2024 saat 10:00" → "2024-11-15T07:00:00.000Z" (yerel 10:00 - 3 = UTC 07:00)

**OUTPUT FORMAT (JSON) - LANGUAGE EXAMPLES:**
‼️ CRITICAL: Use the SAME language as the PDF! Do not translate! ‼️

Example 1 - TURKISH PDF (use Turkish in ALL fields):
{
  "summary": "Belgenin kısa özeti (1-2 cümle)",
  "documentType": "court_document",
  "suggestedTasks": [
    {
      "title": "Duruşmaya katıl - 15 Kasım 2024 Saat 10:00",
      "description": "Ankara 5. Ağır Ceza Mahkemesi - Tanık dinlemesi",
      "dueDate": "2024-11-15T07:00:00.000Z",
      "category": "Hukuk",
      "priority": "high"
    }
  ],
  "suggestedNotes": [
    {
      "title": "Duruşma Detayları",
      "content": "Önceki duruşmada eksik belgeler talep edildi...",
      "tags": ["hukuk", "duruşma"]
    }
  ],
  "entities": {
    "dates": ["2024-11-15 10:00"],
    "people": ["Av. Mehmet Yılmaz"],
    "organizations": ["Ankara 5. Ağır Ceza Mahkemesi"],
    "locations": ["Ankara Adalet Sarayı"],
    "amounts": []
  }
}

Example 2 - ENGLISH PDF (use English in ALL fields):
{
  "summary": "Brief summary of the document (1-2 sentences)",
  "documentType": "invoice",
  "suggestedTasks": [
    {
      "title": "Pay invoice by due date",
      "description": "Total amount due: $500",
      "dueDate": "2024-11-15T07:00:00.000Z",
      "category": "Finance",
      "priority": "high"
    }
  ],
  "suggestedNotes": [
    {
      "title": "Invoice Details",
      "content": "Invoice #12345. Payment terms: Net 30...",
      "tags": ["finance", "invoice"]
    }
  ],
  "entities": {
    "dates": ["2024-11-15"],
    "people": ["John Smith"],
    "organizations": ["ABC Corporation"],
    "locations": ["New York"],
    "amounts": ["$500"]
  }
}

**IMPORTANT RULES:**
1. ‼️ LANGUAGE: Write title, description, content, summary in PDF's ORIGINAL language
   - Turkish PDF → Turkish output ("Duruşmaya katıl", "Ankara Mahkemesi")
   - English PDF → English output ("Attend hearing", "Court of Law")
   - DO NOT translate, DO NOT mix languages
2. Priority: Urgent dates = high, Normal = medium, Optional = low
3. Category: Based on document type (Legal/Hukuk, Finance/Finans, Work/İş, Personal/Kişisel)
4. Metadata: Add document-specific extra information

**CRITICAL - FINAL CHECK BEFORE RESPONDING:**
✅ Did I check the PDF's language?
✅ Are ALL text fields (title, description, content, summary) in the PDF's ORIGINAL language?
✅ Did I avoid translating to English if the PDF is in another language?

ONLY return JSON in the format above. No other text, explanation, or comments!`;

    const pdfPart = {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64Data.split(',')[1] || base64Data, // Remove data:application/pdf;base64, prefix if exists
      },
    };

    const result = await model.generateContent([prompt, pdfPart]);
    const response = await result.response;
    const text = response.text();

    return safelyParseJSON<PdfAnalysisResult>(text);
  } catch (error) {
    console.error('Error analyzing PDF document:', error);
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
    // Advanced NLP
    parseComplexCommand,
    detectTaskDependencies,
    analyzeTaskWithContext,
    // Multimodal Enhancements
    analyzeImageAdvanced,
    extractTasksFromCalendarImage,
    createTaskFromInvoice,
    digitizeHandwriting,
    // PDF Analysis
    analyzePdfDocument,
};

// Export PdfAnalysisResult type
export type { PdfAnalysisResult };
