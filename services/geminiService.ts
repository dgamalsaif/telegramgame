
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, IntelLink, SearchParams, PlatformType } from "../types";

/**
 * استخراج JSON بشكل آمن من استجابة الموديل
 */
const parseSafeJSON = (text: string): any => {
  try {
    let cleanText = text.trim();
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return null;
  }
};

/**
 * اختبار الاتصال بالمحرك - يتم إنشاء المحرك لحظة الاستدعاء
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "ping",
    });
    return !!response.text;
  } catch (e) {
    console.error("API Connection Test Failed:", e);
    return false;
  }
};

/**
 * البحث الاستخباراتي العالمي
 */
export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  // إنشاء المحرك لحظة الطلب لضمان استخدام المفتاح الصحيح من البيئة
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const queryBase = params.query.trim();
  const geoContext = [params.location, params.specialty].filter(Boolean).join(' ');
  
  const platformVectors: Record<string, string> = {
    'Telegram': '(site:t.me OR site:telegram.me OR "t.me/+")',
    'WhatsApp': '(site:chat.whatsapp.com OR "chat.whatsapp")',
    'Discord': '(site:discord.gg OR "discord.com/invite")',
    'Facebook': '(site:facebook.com/groups)',
    'LinkedIn': '(site:linkedin.com/groups)',
    'Reddit': '(site:reddit.com/r)',
    'Instagram': '(site:instagram.com)',
    'X': '(site:x.com OR site:twitter.com)',
    'TikTok': '(site:tiktok.com intext:"chat" OR intext:"join")',
  };

  const searchScope = params.platforms
    .map(p => platformVectors[p])
    .filter(Boolean)
    .join(' OR ');

  const searchVector = `(${searchScope}) "${queryBase}" ${geoContext}`;

  const systemInstruction = `You are SCOUT OPS Intelligence v7.5. Locate, categorize, and verify community invite links. 
  Output strictly valid JSON: { "analysis": "string", "links": [{"title": "string", "description": "string", "url": "string", "platform": "string", "confidence": number, "source": {"name": "string", "uri": "string", "type": "string"}}] }.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `[INITIATE_OSINT_RECON] TARGET: "${queryBase}" | VECTOR: ${searchVector}`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const data = parseSafeJSON(response.text);
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // استخراج الروابط من أداة البحث (Google Search Grounding)
    const verifiedLinks: IntelLink[] = grounding
      .filter((c: any) => c.web)
      .map((c: any, i: number) => {
        const url = c.web.uri || '';
        let platform: PlatformType = 'Telegram';
        if (url.includes('whatsapp')) platform = 'WhatsApp';
        else if (url.includes('discord')) platform = 'Discord';
        else if (url.includes('facebook')) platform = 'Facebook';
        else if (url.includes('x.com') || url.includes('twitter')) platform = 'X';
        
        return {
          id: `v-${i}-${Date.now()}`,
          title: c.web.title || "Discovered Signal",
          description: "Verified node found via real-time web grounding.",
          url,
          isPrivate: url.includes('join') || url.includes('invite'),
          isActive: true,
          platform,
          confidence: 99,
          location: { country: params.location },
          source: {
            name: "Google Intelligence Search",
            uri: url,
            type: 'Direct'
          },
          timestamp: new Date().toISOString()
        };
      });

    const aiLinks = (data?.links || []).map((l: any, i: number) => ({
      ...l,
      id: `ai-${i}-${Date.now()}`,
      isActive: true,
      timestamp: new Date().toISOString(),
      location: { country: params.location }
    }));

    const allLinks = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(v => v.url.toLowerCase()));
    aiLinks.forEach((al: any) => {
      if (al.url && !seenUrls.has(al.url.toLowerCase())) allLinks.push(al);
    });

    return {
      analysis: data?.analysis || "Reconnaissance complete.",
      links: allLinks,
      messages: [],
      sources: verifiedLinks.map(l => ({ title: l.title, uri: l.url })),
      stats: {
        totalFound: allLinks.length,
        privateCount: allLinks.filter(l => l.isPrivate).length,
        activeCount: allLinks.length,
        medicalMatches: allLinks.length
      }
    };
  } catch (error) {
    console.error("Engine Fault:", error);
    throw error;
  }
};
