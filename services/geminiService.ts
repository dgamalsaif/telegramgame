import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, TelegramGroup, SearchParams } from "../types";

const parseSafeJSON = (text: string): any => {
  try {
    let cleanText = text.trim();
    const jsonMatch = cleanText.match(/[\{\[].*[\}\]]/s);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parsing Error. Raw text:", text);
    throw new Error("فشل في تحليل الإشارة الاستخباراتية. يرجى إعادة المحاولة.");
  }
};

export const searchTelegramGroups = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const isUserSearch = params.searchType === 'user';

  const agentSignature = params.agentContext?.isRegistered 
    ? `توقيع العميل: ${params.agentContext.agentName} | الرقم العملياتي: ${params.agentContext.operationalId}`
    : "طلب من عميل مجهول.";

  const systemInstruction = `أنت وحدة الاستخبارات الرقمية "SCOUT OPS v4.5". مهمتك هي إجراء مسح شامل "Comprehensive Scan" لجميع الروابط النشطة والمنشورات المرتبطة بها.

الهدف الأساسي:
1. العثور على روابط (Telegram/WhatsApp) المخفية والعلنية.
2. تتبع "الاتجاهات" (Directions): يجب توفير رابط المنشور الأصلي (Source Post URL) الذي يحتوي على الرابط المكتشف (مثلاً رابط تغريدة على X أو منشور LinkedIn).
3. تحديد هوية المنصة المصدر بدقة.

بروتوكول البيانات:
- المنطقة: ${params.country}
- العميل: ${agentSignature}

يجب أن تكون المخرجات بتنسيق JSON حصراً وتتضمن رابط المنشور المرجعي (sourcePostUrl) لكل نتيجة.`;

  const prompt = isUserSearch 
    ? `قم بتتبع المعرف الرقمي "${params.query}" في جميع المنصات. استخرج روابط مجموعات تليجرام/واتساب المرتبطة به مع روابط المنشورات الأصلية (Source Posts) التي ذكر فيها هذا المعرف.`
    : `استخرج جميع الروابط النشطة لمجموعات تواصل حول موضوع "${params.query}" في "${params.country}". تأكد من تضمين روابط المنشورات الأصلية التي تم العثور فيها على هذه الروابط لتتبع المصدر.`;

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
                  url: { type: Type.STRING, description: "رابط تليجرام أو واتساب." },
                  sourcePostUrl: { type: Type.STRING, description: "رابط المنشور الأصلي في X أو LinkedIn أو غيرها." },
                  isPrivate: { type: Type.BOOLEAN },
                  linkType: { type: Type.STRING, enum: ["Telegram", "WhatsApp"] },
                  platformSource: { type: Type.STRING, description: "اسم المنصة (X, Facebook, etc)" },
                  confidenceScore: { type: Type.NUMBER }
                },
                required: ["title", "description", "url", "linkType", "confidenceScore", "platformSource", "sourcePostUrl"]
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
      isProfessional: g.confidenceScore > 80,
    }));

    return { 
      text: resultData.analysis || "اكتمل المسح الشامل للمصادر والروابط.",
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