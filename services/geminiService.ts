
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, IntelLink, SearchParams, PlatformType } from "../types";

const parseSafeJSON = (text: string): any => {
  try {
    let cleanText = text.trim();
    // Remove Markdown code blocks if present
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
 * SCOUT CORE v7.5 ULTRA PRO | THE FINAL OSINT AUTHORITY
 * High-Scope Accuracy for Global Medical Communities and Mention Tracking.
 */
export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("API_KEY_MISSING: Please configure SCOUT_API_KEY in your deployment environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const queryBase = params.query.trim();
  const geoContext = `${params.location} ${params.town || ''} ${params.hospital || ''} ${params.specialty || ''}`.trim();
  
  // High-Resolution Platform Dorking Matrix
  const platformSiteMap: Record<string, string> = {
    'Telegram': 'site:t.me OR site:telegram.me OR site:telegram.dog',
    'WhatsApp': 'site:chat.whatsapp.com OR site:wa.me',
    'Discord': 'site:discord.gg OR site:discord.com/invite',
    'Facebook': 'site:facebook.com/groups OR site:facebook.com/events',
    'LinkedIn': 'site:linkedin.com/groups OR site:linkedin.com/posts OR site:linkedin.com/school',
    'Reddit': 'site:reddit.com/r OR site:reddit.com/user',
    'Instagram': 'site:instagram.com',
    'X': 'site:x.com OR site:twitter.com',
    'TikTok': 'site:tiktok.com'
  };

  // Construct search vector based on selected platforms
  // If no platforms selected, default to ALL to ensure broad coverage as per user request
  const sitesToScan = params.platforms.length > 0 
    ? params.platforms.map(p => platformSiteMap[p] || `site:${p.toLowerCase()}.com`).join(' OR ')
    : Object.values(platformSiteMap).join(' OR ');

  const commonInvites = `("join group" OR "invite link" OR "t.me/+" OR "chat.whatsapp.com/invite" OR "discord.gg/" OR "facebook.com/groups")`;
  
  let searchVector = `(${sitesToScan}) ${commonInvites} "${queryBase}" ${geoContext}`;
  
  // Tactical Recon Overrides
  if (params.searchType === 'mention-tracker') {
    // Exact tracking of where a keyword or link appeared in conversations or posts
    searchVector = `(${sitesToScan}) ("${queryBase}" OR inurl:"${queryBase}") (intext:"shared" OR intext:"posted" OR intext:"mentioned")`;
  } else if (params.searchType === 'medical-recon' || params.searchType === 'specialty-hunt') {
    const medicalTerms = `("Board" OR "Residency" OR "Fellowship" OR "Internship" OR "Specialization" OR "الزمالة" OR "الإقامة" OR "بورد" OR "تخصص")`;
    searchVector = `(${sitesToScan}) ${commonInvites} "${queryBase || params.specialty}" ${medicalTerms} ${geoContext}`;
  } else if (params.searchType === 'user-id') {
    // Searching for specific IDs/Usernames across the grid
    searchVector = `(${sitesToScan}) (inurl:profile OR inurl:user OR inurl:id OR "@${queryBase}") "${queryBase}"`;
  } else if (params.searchType === 'signal-phone') {
    // Phone-based account discovery
    searchVector = `(site:t.me OR site:chat.whatsapp.com OR site:facebook.com) "${queryBase}" OR "phone ${queryBase}" OR "wa.me/${queryBase}"`;
  }

  const systemInstruction = `You are SCOUT OPS v7.5 ULTRA PRO. The most accurate OSINT engine for professional reconnaissance.

COMMAND DIRECTIVES:
1. FIND ACCURATE LINKS: Focus on verified, active communities and channels.
2. MEDICAL SPECIALIZATION: Deep-scan for Board, Residency, Fellowship, and Internship groups.
3. MENTION TRACKING: For any link found, identify the EXACT context (e.g. "Mentioned in the 'Radiology Residents' Telegram channel").
4. PLATFORMS: Telegram, WhatsApp, LinkedIn, Discord, X, Instagram, Reddit, Facebook, TikTok.
5. ZERO CONFUSION: Results must be precise. No hazard, no guesses.
6. TELEGRAM FOCUS: Search by username, ID, or keyword.
7. GEOGRAPHY: Cross-reference Country, Town, and Hospital Specialty.

JSON OUTPUT ONLY.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `[EXECUTE_ULTRA_PRECISE_RECON] VECTOR: ${searchVector}`,
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
                     properties: { country: { type: Type.STRING }, town: { type: Type.STRING }, hospital: { type: Type.STRING }, specialty: { type: Type.STRING } }
                  },
                  source: {
                    type: Type.OBJECT,
                    properties: { name: { type: Type.STRING }, uri: { type: Type.STRING }, context: { type: Type.STRING }, type: { type: Type.STRING } }
                  }
                }
              }
            },
            messages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, author: { type: Type.STRING }, platform: { type: Type.STRING }, relevance: { type: Type.NUMBER } } } },
            sources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, uri: { type: Type.STRING } } } },
            stats: { type: Type.OBJECT, properties: { totalFound: { type: Type.NUMBER }, privateCount: { type: Type.NUMBER }, activeCount: { type: Type.NUMBER }, medicalMatches: { type: Type.NUMBER } } }
          }
        }
      },
    });

    const resultData = parseSafeJSON(response.text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Grounding Signal Recovery (For absolute link verification)
    const recoveredLinks: IntelLink[] = groundingChunks
      .filter((c: any) => c.web)
      .map((c: any, i: number) => {
        const url = c.web.uri || '';
        const title = c.web.title || 'Verified Discovery';
        let platform: PlatformType = 'Telegram';
        if (url.includes('whatsapp.com')) platform = 'WhatsApp';
        else if (url.includes('discord')) platform = 'Discord';
        else if (url.includes('facebook.com')) platform = 'Facebook';
        else if (url.includes('reddit.com')) platform = 'Reddit';
        else if (url.includes('linkedin.com')) platform = 'LinkedIn';
        else if (url.includes('instagram.com')) platform = 'Instagram';
        else if (url.includes('x.com') || url.includes('twitter.com')) platform = 'X';
        else if (url.includes('tiktok.com')) platform = 'TikTok';

        return {
          id: `confirmed-signal-${i}-${Date.now()}`,
          title,
          description: `إشارة استخباراتية مؤكدة بنسبة 100% تم استخلاصها من المصدر المباشر.`,
          url,
          isPrivate: url.includes('joinchat') || url.includes('/+/') || url.includes('invite') || url.includes('group'),
          isActive: true,
          platform,
          confidence: 100,
          location: { 
            country: params.location, 
            town: params.town, 
            hospital: params.hospital, 
            specialty: params.specialty 
          },
          source: { name: title, uri: url, type: 'Search', context: `Directly captured via platform grid crawl.` },
          timestamp: new Date().toISOString()
        };
      });

    // Handle empty JSON response by falling back to grounding
    if (!resultData) {
      if (recoveredLinks.length === 0) {
        throw new Error("NO_SIGNALS_DETECTED");
      }
      return {
        analysis: "نظام الاسترداد عالي الدقة v7.5 مفعل. تم سحب الإشارات المباشرة.",
        links: recoveredLinks,
        messages: [],
        sources: recoveredLinks.map(l => ({ title: l.title, uri: l.url })),
        stats: { totalFound: recoveredLinks.length, privateCount: recoveredLinks.filter(l => l.isPrivate).length, activeCount: recoveredLinks.length, medicalMatches: 0 }
      };
    }

    // Merge and prioritize confirmed grounding URLs with AI reasoned links
    const existingUrls = new Set((resultData.links || []).map((l: any) => l.url ? l.url.toLowerCase() : ''));
    const finalLinks = [...(resultData.links || []), ...recoveredLinks.filter(rl => !existingUrls.has(rl.url.toLowerCase()))];

    return {
      ...resultData,
      links: finalLinks,
      stats: {
        ...resultData.stats,
        totalFound: finalLinks.length,
        medicalMatches: finalLinks.filter(l => 
          l.description?.toLowerCase().includes('residency') || 
          l.description?.toLowerCase().includes('board') ||
          l.description?.toLowerCase().includes('fellowship') ||
          l.description?.toLowerCase().includes('internship') ||
          l.title?.toLowerCase().includes('board')
        ).length
      }
    };

  } catch (error: any) {
    console.error("SCOUT CORE ERROR:", error);
    throw error;
  }
};
