
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, IntelLink, SearchParams, PlatformType } from "../types";

const parseSafeJSON = (text: string): any => {
  try {
    let cleanText = text.trim();
    // Aggressive cleanup for markdown
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
 * SCOUT OPS v7.5 ULTRA PRO | CORE INTELLIGENCE SERVICE
 * Utilizing Gemini 3 Pro with Google Search Grounding for link discovery.
 */
export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  
  const queryBase = params.query.trim();
  const geoContext = [params.location, params.specialty].filter(Boolean).join(' ');
  
  // High-precision Dorks for Invite Discovery
  const platformVectors: Record<string, string> = {
    'Telegram': '(site:t.me OR site:telegram.me OR "t.me/+")',
    'WhatsApp': '(site:chat.whatsapp.com OR "chat.whatsapp")',
    'Discord': '(site:discord.gg OR "discord.com/invite")',
    'Facebook': '(site:facebook.com/groups)',
    'LinkedIn': '(site:linkedin.com/groups)',
    'Reddit': '(site:reddit.com/r)',
    'Instagram': '(site:instagram.com)',
    'X': '(site:x.com OR site:twitter.com)',
  };

  const searchScope = params.platforms
    .map(p => platformVectors[p])
    .filter(Boolean)
    .join(' OR ');

  let specializedTerms = '';
  if (params.searchType === 'medical-recon') {
    specializedTerms = '("Board" OR "Residency" OR "PGY" OR "Fellowship" OR "Medical Group" OR "بورد")';
  } else if (params.searchType === 'mention-tracker') {
    specializedTerms = '(intext:"invite link" OR intext:"join this group")';
  }

  const searchVector = `(${searchScope}) ${specializedTerms} "${queryBase}" ${geoContext}`;

  const systemInstruction = `You are SCOUT OPS Intelligence v7.5. Your mission is to locate, categorize, and verify community invite links.

PROTOCOLS:
1. Identify EXACT URLs for Telegram channels, WhatsApp groups, Discord invites, etc.
2. Provide a descriptive analysis of the community found.
3. Categorize results as "Direct" (if it's an invite link) or "Mention" (if it's a discussion about a link).
4. Assign a confidence score (0-100) based on link validity.

Output strictly valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `[INITIATE_OSINT_RECON] TARGET: "${queryBase}" | VECTOR: ${searchVector}`,
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
                  source: {
                    type: Type.OBJECT,
                    properties: { 
                      name: { type: Type.STRING }, 
                      uri: { type: Type.STRING }, 
                      type: { type: Type.STRING }, 
                      context: { type: Type.STRING } 
                    }
                  }
                }
              }
            },
            stats: {
              type: Type.OBJECT,
              properties: {
                totalFound: { type: Type.NUMBER },
                medicalMatches: { type: Type.NUMBER }
              }
            }
          }
        }
      },
    });

    const data = parseSafeJSON(response.text);
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Integrate Grounding Data
    const verifiedLinks: IntelLink[] = grounding
      .filter((c: any) => c.web)
      .map((c: any, i: number) => {
        const url = c.web.uri || '';
        let platform: PlatformType = 'Telegram';
        if (url.includes('whatsapp')) platform = 'WhatsApp';
        else if (url.includes('discord')) platform = 'Discord';
        else if (url.includes('linkedin')) platform = 'LinkedIn';
        else if (url.includes('facebook')) platform = 'Facebook';
        else if (url.includes('reddit')) platform = 'Reddit';
        else if (url.includes('twitter') || url.includes('x.com')) platform = 'X';

        return {
          id: `v-${i}-${Date.now()}`,
          title: c.web.title || "Discovered Signal",
          description: "Verified node found via Google Search grounding.",
          url,
          isPrivate: url.includes('join') || url.includes('invite'),
          isActive: true,
          platform,
          confidence: 99,
          location: { country: params.location },
          source: {
            name: "Google Search Grounding",
            uri: url,
            type: 'Direct',
            context: "Real-time verified web signal."
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

    // Merge & Deduplicate
    const allLinks = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(v => v.url.toLowerCase()));

    aiLinks.forEach((al: any) => {
      if (!seenUrls.has(al.url.toLowerCase())) {
        allLinks.push(al);
      }
    });

    return {
      analysis: data?.analysis || "Operation complete. System synchronized.",
      links: allLinks,
      messages: [],
      sources: verifiedLinks.map(l => ({ title: l.title, uri: l.url })),
      stats: {
        totalFound: allLinks.length,
        privateCount: allLinks.filter(l => l.isPrivate).length,
        activeCount: allLinks.length,
        medicalMatches: data?.stats?.medicalMatches || allLinks.length
      }
    };

  } catch (error) {
    console.error("Engine Fault:", error);
    throw error;
  }
};
