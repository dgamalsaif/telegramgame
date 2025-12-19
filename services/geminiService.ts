import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, TelegramGroup, SearchParams } from "../types";

const parseSafeJSON = (text: string): any => {
  try {
    let cleanText = text.trim();
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parsing Error. Raw text:", text);
    throw new Error("فشل في تحليل البيانات الاستخباراتية. يرجى مراجعة جودة الإشارة.");
  }
};

export const searchTelegramGroups = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const isUserSearch = params.searchType === 'user';

  const agentInfo = params.agentContext?.isRegistered 
    ? `العميل المستعلم: ${params.agentContext.agentName} (معرف: ${params.agentContext.operationalId}).`
    : "";

  const systemInstruction = `أنت محرك الاستخبارات الرقمي "SCOUT OPS v4.0". مهمتك استخراج روابط التواصل الاجتماعي (تليجرام وواتساب) بدقة متناهية.
  
  بروتوكول الفحص:
  - النطاق: ${params.country} | الفئة: ${params.category} | اللغة: ${params.language}
  - ${agentInfo}
  
  قواعد استخراج البيانات:
  1. روابط تليجرام: ابحث عن t.me/joinchat، t.me/+، t.me/[الاسم].
  2. روابط واتساب: ابحث عن chat.whatsapp.com.
  3. البحث بالمعرف (User/ID): إذا كان نوع البحث "user"، تتبع بصمة المعرف "${params.query}" عبر المنصات (LinkedIn, X, GitHub) لاستخراج المجموعات المرتبطة به.
  
  يجب أن يكون الناتج كائن JSON حصراً.`;

  const prompt = isUserSearch 
    ? `قم بإجراء مسح شامل للمعرف الرقمي أو اسم المستخدم: "${params.query}". ابحث عن المجموعات والقنوات التي يديرها أو يتواجد فيها هذا الحساب في منطقة ${params.country}.`
    : `استخرج روابط نشطة لمجموعات وقنوات تتعلق بـ "${params.query}" في تصنيف "${params.category}" داخل "${params.country}".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  url: { type: Type.STRING },
                  isPrivate: { type: Type.BOOLEAN },
                  linkType: { type: Type.STRING, enum: ["Telegram", "WhatsApp"] },
                  platformSource: { type: Type.STRING },
                  confidenceScore: { type: Type.NUMBER }
                },
                required: ["title", "description", "url", "linkType", "confidenceScore", "platformSource"]
              }
            },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
          },
          required: ["analysis", "groups", "riskLevel"]
        }
      },
    });

    const resultData = parseSafeJSON(response.text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = (groundingChunks as any[])
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: String(chunk.web.title || 'مصدر خارجي'),
        uri: String(chunk.web.uri || '#'),
      }));

    const parsedGroups: TelegramGroup[] = (resultData.groups || []).map((g: any) => ({
      ...g,
      id: `intel-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      isProfessional: g.confidenceScore > 75,
      category: params.category,
      country: params.country,
      language: params.language
    }));

    return { 
      text: resultData.analysis || "اكتمل تحليل الإشارات.",
      sources, 
      parsedGroups,
      summary: {
        totalDetected: parsedGroups.length,
        privateRatio: `${parsedGroups.filter(g => g.isPrivate).length}/${parsedGroups.length}`,
        riskLevel: resultData.riskLevel || "Low"
      }
    };
  } catch (error: any) {
    console.error("Critical Failure:", error);
    throw error;
  }
};