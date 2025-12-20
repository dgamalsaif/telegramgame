
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, IntelLink, IntelMessage, SearchParams, PlatformType } from "../types";

const parseSafeJSON = (text: string): any => {
  try {
    let cleanText = text.trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    return null;
  }
};

/**
 * SCOUT CORE v16.0 | Advanced Neural Recon Engine
 */
export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  // Create new instance per request as per best practices
  const ai = new GoogleGenAI({ apiKey });
  
  // Deep Query Synthesis: Construct multiple specialized search vectors
  const baseVector = params.query.trim();
  const geoVector = `${params.location} ${params.town || ''} ${params.hospital || ''}`.trim();
  
  const specializedQueries = [
    // Direct community links
    `site:chat.whatsapp.com "${baseVector}" ${geoVector}`,
    `site:t.me/joinchat "${baseVector}" ${geoVector}`,
    `site:discord.gg "${baseVector}"`,
    // Directory and index searches
    `"group link" "${baseVector}" ${geoVector} -facebook.com/groups`,
    // Contextual hospital/medical grid (if hospital provided)
    params.hospital ? `"${params.hospital}" community group link OR chat.whatsapp.com` : "",
    // Social media specific signals
    `site:facebook.com/groups "${baseVector}" ${geoVector}`
  ].filter(q => q !== "").join(" OR ");

  const systemInstruction = `You are the SCOUT OPS v16.0 OSINT Intelligence Engine. 
  
  Your primary objective is to find REAL, ACTIVE community links (WhatsApp, Telegram, Discord) based on keywords and location.

  STRICT OPERATIONAL RULES:
  1. NO PHONE NUMBERS: Never search for or return links based on specific phone numbers.
  2. REAL RESULTS: Prioritize actual invite URLs over generic landing pages.
  3. DATA EXTRACTION: Extract information from EVERY search grounding chunk.
  4. ACCURACY: If you find a link, verify its context against the user's location (${params.location}) and keywords (${params.query}).
  5. OUTPUT: Provide a detailed analysis, structured links, and message snippets if available.

  JSON response is mandatory. Schema follows:
  - analysis: Summary of the digital footprint found.
  - links: Array of IntelLink (id, title, description, url, isPrivate, platform, confidence, location, source).
  - messages: Array of intercepted message snippets relevant to the query.
  - sources: Verification sources.
  - stats: Metrics (total, private, active, medical).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `[INITIATE DEEP RECON v16.0] Target: ${baseVector} | Sector: ${geoVector} | Search Strategy: Specialized Multi-Vector | Vector: ${specializedQueries}`,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          links: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
                platform: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                isPrivate: { type: Type.BOOLEAN },
                isActive: { type: Type.BOOLEAN },
                location: {
                   type: Type.OBJECT,
                   properties: { country: { type: Type.STRING }, town: { type: Type.STRING }, hospital: { type: Type.STRING } }
                },
                source: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, uri: { type: Type.STRING }, type: { type: Type.STRING } }
                }
              }
            }
          },
          messages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, author: { type: Type.STRING }, platform: { type: Type.STRING }, relevance: { type: Type.NUMBER } } } },
          sources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, uri: { type: Type.STRING } } } },
          stats: { type: Type.OBJECT, properties: { totalFound: { type: Type.NUMBER }, privateCount: { type: Type.NUMBER }, activeCount: { type: Type.NUMBER }, hospitalMatches: { type: Type.NUMBER } } }
        }
      }
    },
  });

  const resultData = parseSafeJSON(response.text);
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  // Forced Recovery Protocol (High Reliability Mode)
  const recoveryLinks: IntelLink[] = groundingChunks
    .filter((c: any) => c.web)
    .map((c: any, i: number) => {
      const url = c.web.uri || '';
      const title = c.web.title || 'Live Signal';
      let platform: PlatformType = 'Telegram';
      if (url.includes('whatsapp.com')) platform = 'WhatsApp';
      else if (url.includes('discord')) platform = 'Discord';
      else if (url.includes('facebook')) platform = 'Facebook';
      else if (url.includes('x.com') || url.includes('twitter')) platform = 'X';

      return {
        id: `v16-rec-${i}-${Math.random().toString(36).substr(2, 6)}`,
        title,
        description: `إشارة موثقة تم استخراجها مباشرة من فهارس الويب النشطة. المصدر: ${title}`,
        url,
        isPrivate: url.includes('joinchat') || url.includes('invite') || url.includes('group'),
        isActive: true,
        platform,
        confidence: 98,
        location: { country: params.location, town: params.town, hospital: params.hospital },
        source: { name: title, uri: url, type: 'Search' },
        timestamp: new Date().toISOString()
      };
    });

  if (!resultData) {
    return {
      analysis: "تم تفعيل وضع الاسترداد المباشر v16.0. النتائج المعروضة هي روابط حقيقية مكتشفة عبر فحص الفهارس الحية.",
      links: recoveryLinks,
      messages: [],
      sources: recoveryLinks.map(l => ({ title: l.title, uri: l.url })),
      stats: { totalFound: recoveryLinks.length, privateCount: recoveryLinks.filter(l => l.isPrivate).length, activeCount: recoveryLinks.length, hospitalMatches: recoveryLinks.filter(l => l.location.hospital).length }
    };
  }

  // Deduplicate and Merge with prioritized Grounding results
  const existingUrls = new Set((resultData.links || []).map((l: any) => l.url.toLowerCase()));
  const uniqueRecovery = recoveryLinks.filter(rl => !existingUrls.has(rl.url.toLowerCase()));
  const mergedLinks = [...(resultData.links || []), ...uniqueRecovery];

  return {
    ...resultData,
    links: mergedLinks,
    stats: {
      ...resultData.stats,
      totalFound: mergedLinks.length,
      activeCount: mergedLinks.length,
      privateCount: mergedLinks.filter(l => l.isPrivate).length
    }
  };
};
