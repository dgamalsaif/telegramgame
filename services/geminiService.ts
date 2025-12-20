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
 * SCOUT CORE v7.5 | The Ultimate OSINT Neural Engine
 * Enhanced with Deep-Scan v7.6 logic for hidden communities and encrypted signals.
 */
export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  
  const queryBase = params.query.trim();
  const geoContext = `${params.location} ${params.town || ''} ${params.hospital || ''}`.trim();
  
  // Tactical Multi-Platform Search Vector v7.5
  const platformsToSearch = [
    't.me', 'chat.whatsapp.com', 'discord.gg', 'facebook.com/groups', 
    'instagram.com', 'linkedin.com/groups', 'tiktok.com', 'twitter.com', 'x.com'
  ];
  
  let searchVector = platformsToSearch.map(site => `site:${site}`).join(' OR ') + ` "${queryBase}" ${geoContext}`;
  
  if (params.searchType === 'signal-phone') {
    searchVector = `(site:t.me OR site:chat.whatsapp.com) "${queryBase}" OR "phone ${queryBase}" OR "wa.me/${queryBase}"`;
  } else if (params.searchType === 'user-id') {
    searchVector = `"${queryBase}" (inurl:profile OR inurl:user OR inurl:id OR "@${queryBase}") (site:telegram.me OR site:t.me OR site:facebook.com OR site:twitter.com OR site:instagram.com OR site:linkedin.com)`;
  } else if (params.searchType === 'deep-scan') {
    // Expanded deep-scan logic to include hidden and unindexed patterns
    searchVector = `"${queryBase}" ${geoContext} (intext:"join group" OR intext:"invite link" OR "chat history" OR "leaked messages" OR "hidden community" OR "encrypted messages" OR "unindexed public pages" OR "secret chat")`;
  }

  const systemInstruction = `You are SCOUT OPS v7.5 ULTIMATE OSINT ENGINE.
  Your mission is to find digital communities, group links, user profiles, and specific messages across Telegram, WhatsApp, Discord, Facebook, X, Instagram, LinkedIn, and TikTok.

  SPECIAL DIRECTIVE: For 'deep-scan' operations, you MUST explicitly look for 'hidden communities', 'encrypted messages', and 'unindexed public pages' related to the query.

  SEARCH PARAMETERS:
  - Target: ${queryBase}
  - Type: ${params.searchType}
  - Location: ${params.location}
  - Town: ${params.town || 'N/A'}
  - Hospital: ${params.hospital || 'N/A'}

  CONSTRAINTS:
  1. Identify both PUBLIC and PRIVATE groups (private often have keywords like "joinchat" or "invite").
  2. Extract message snippets that appear in the results.
  3. Categorize precisely by platform.
  4. Ensure Geographic relevance to the provided country/town/hospital.
  5. Identify findings that qualify as 'hidden matches' (unindexed or encrypted references).
  6. OUTPUT MUST BE VALID JSON ONLY.

  JSON Schema:
  {
    "analysis": "A professional summary of the recon finding",
    "links": [{"title", "description", "url", "platform", "confidence", "isPrivate", "isActive", "location": {"country", "town", "hospital"}, "source": {"name", "uri"}}],
    "messages": [{"content", "author", "platform", "relevance"}],
    "sources": [{"title", "uri"}],
    "stats": {"totalFound", "privateCount", "activeCount", "hospitalMatches", "hiddenMatches"}
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `[EXECUTE GLOBAL RECON v7.5 - DEEP SCAN ENHANCED] SECTOR: ${geoContext} | QUERY: ${queryBase} | VECTOR: ${searchVector}`,
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
                  properties: { name: { type: Type.STRING }, uri: { type: Type.STRING } }
                }
              }
            }
          },
          messages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, author: { type: Type.STRING }, platform: { type: Type.STRING }, relevance: { type: Type.NUMBER } } } },
          sources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, uri: { type: Type.STRING } } } },
          stats: { 
            type: Type.OBJECT, 
            properties: { 
              totalFound: { type: Type.NUMBER }, 
              privateCount: { type: Type.NUMBER }, 
              activeCount: { type: Type.NUMBER }, 
              hospitalMatches: { type: Type.NUMBER },
              hiddenMatches: { type: Type.NUMBER }
            } 
          }
        }
      }
    },
  });

  const resultData = parseSafeJSON(response.text);
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  // Manual Signal Extraction (Grounding Fallback)
  const recoveredLinks: IntelLink[] = groundingChunks
    .filter((c: any) => c.web)
    .map((c: any, i: number) => {
      const url = c.web.uri || '';
      const title = c.web.title || 'Signal Detected';
      let platform: PlatformType = 'Telegram';
      if (url.includes('whatsapp.com')) platform = 'WhatsApp';
      else if (url.includes('discord')) platform = 'Discord';
      else if (url.includes('facebook.com')) platform = 'Facebook';
      else if (url.includes('instagram.com')) platform = 'Instagram';
      else if (url.includes('linkedin.com')) platform = 'LinkedIn';
      else if (url.includes('tiktok.com')) platform = 'TikTok';
      else if (url.includes('x.com') || url.includes('twitter.com')) platform = 'X';

      return {
        id: `v7.5-link-${i}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        description: `إشارة تم التقاطها آلياً من المصدر المفتوح للتحقق الميداني.`,
        url,
        isPrivate: url.includes('joinchat') || url.includes('invite') || url.includes('group') || url.includes('private'),
        isActive: true,
        platform,
        confidence: 100,
        location: { country: params.location, town: params.town, hospital: params.hospital },
        source: { name: title, uri: url, type: 'Search' },
        timestamp: new Date().toISOString()
      };
    });

  if (!resultData) {
    return {
      analysis: "نظام الاسترداد التلقائي v7.5 مفعل. تم سحب البيانات المباشرة من محرك البحث لضمان شمولية التغطية.",
      links: recoveredLinks,
      messages: [],
      sources: recoveredLinks.map(l => ({ title: l.title, uri: l.url })),
      stats: { totalFound: recoveredLinks.length, privateCount: recoveredLinks.filter(l => l.isPrivate).length, activeCount: recoveredLinks.length, hospitalMatches: 0, hiddenMatches: 0 }
    };
  }

  // Merge Data
  const existingUrls = new Set((resultData.links || []).map((l: any) => l.url.toLowerCase()));
  const uniqueRecovered = recoveredLinks.filter(rl => !existingUrls.has(rl.url.toLowerCase()));
  const finalLinks = [...(resultData.links || []), ...uniqueRecovered];

  return {
    ...resultData,
    links: finalLinks,
    stats: {
      ...resultData.stats,
      totalFound: finalLinks.length,
      activeCount: finalLinks.length,
      privateCount: finalLinks.filter((l: any) => l.isPrivate).length,
      hiddenMatches: resultData.stats.hiddenMatches || 0
    }
  };
};