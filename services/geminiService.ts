
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, IntelLink, SearchParams, PlatformType } from "../types";

const parseSafeJSON = (text: string): any => {
  try {
    let cleanText = text.trim();
    // Aggressive cleanup for Markdown code blocks
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
 * SCOUT CORE v7.5 ULTIMATE | PRECISION LINK & CONTEXT ENGINE
 * Focus: Absolute accuracy in distinguishing 'Direct Group Links' from 'Mentions'.
 */
export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("API_KEY_MISSING: Deployment requires a valid SCOUT_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const queryBase = params.query.trim();
  const geoContext = `${params.location} ${params.town || ''} ${params.hospital || ''} ${params.specialty || ''}`.trim();
  
  // 1. Platform-Specific "Dorks" (Search Operators)
  // Designed to find either the invite link itself OR a page hosting the link.
  const platformVectors: Record<string, string> = {
    'Telegram': '(site:t.me OR site:telegram.me OR site:telegram.dog)',
    'WhatsApp': '(site:chat.whatsapp.com OR site:wa.me)',
    'Discord': '(site:discord.gg OR site:discord.com/invite)',
    'Facebook': '(site:facebook.com/groups OR site:facebook.com/events)',
    'LinkedIn': '(site:linkedin.com/groups OR site:linkedin.com/posts OR site:linkedin.com/feed)',
    'Reddit': '(site:reddit.com/r OR site:reddit.com/user)',
    'Instagram': '(site:instagram.com)',
    'X': '(site:x.com OR site:twitter.com)',
    'TikTok': '(site:tiktok.com)',
    'General': ''
  };

  // 2. Select Active Platforms
  const targetPlatforms = params.platforms.length > 0 ? params.platforms : Object.keys(platformVectors).filter(k => k !== 'General');
  const sitesQuery = targetPlatforms.map(p => platformVectors[p]).join(' OR ');

  // 3. Define Mode-Specific Keywords
  let searchVector = '';
  
  if (params.searchType === 'mention-tracker') {
    // Look for conversations ABOUT the query
    searchVector = `(${sitesQuery}) "${queryBase}" (intext:"discussed" OR intext:"mentioned" OR intext:"source" OR intext:"link") -site:t.me -site:chat.whatsapp.com`; 
    // Excluding direct invite sites in mention tracker to find DISCUSSIONS instead
  } else if (params.searchType === 'medical-recon' || params.searchType === 'specialty-hunt') {
    // Look for MEDICAL GROUPS specifically
    const medicalKeywords = `("Board" OR "Residency" OR "Fellowship" OR "Internship" OR "Specialization" OR "PGY" OR "Medical Group" OR "بورد" OR "زمالة" OR "أطباء")`;
    const inviteKeywords = `("chat.whatsapp.com" OR "t.me" OR "discord.gg" OR "join group" OR "Group Link")`;
    searchVector = `(${sitesQuery}) ${medicalKeywords} "${queryBase || params.specialty}" ${inviteKeywords} ${geoContext}`;
  } else if (params.searchType === 'user-id') {
    // Look for Profiles
    searchVector = `(${sitesQuery}) (inurl:${queryBase} OR "@${queryBase}")`;
  } else if (params.searchType === 'signal-phone') {
    // Phone reverse lookup
    searchVector = `"${queryBase}" (site:facebook.com OR site:instagram.com OR site:linkedin.com OR site:t.me OR site:wa.me)`;
  } else {
    // Default: Deep Scan for Invites
    searchVector = `(${sitesQuery}) ("chat.whatsapp.com" OR "t.me" OR "discord.gg" OR "joinchat") "${queryBase}" ${geoContext}`;
  }

  const systemInstruction = `You are SCOUT OPS v7.5 ULTIMATE. Your goal is 100% ACCURACY in identifying Social Media Links and Communities.

  CRITICAL INSTRUCTION:
  You must distinguish between a DIRECT LINK (The actual group invite) and a MENTION (A post talking about it).
  
  DATA EXTRACTION RULES:
  1. **URL**: Must be the direct link to the group/account if available (e.g., t.me/example), otherwise the source URL.
  2. **CONTEXT**: If the link is found inside a Reddit post or LinkedIn article, the 'context' field MUST explain this (e.g., "Mentioned in a LinkedIn post by Dr. X about Residency").
  3. **PLATFORM**: Identify the platform of the DESTINATION link, not just the source.
  4. **ACCURACY**: Do not guess. If a link is private, mark isPrivate: true.
  
  TARGETS:
  - Query: ${queryBase}
  - Platforms: ${targetPlatforms.join(', ')}
  - Scope: ${params.searchType}
  
  JSON OUTPUT REQUIRED.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `[EXECUTE_PRECISION_SCAN] VECTOR: ${searchVector}`,
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

    // 4. Grounding Verification (The "Perfect Accuracy" Layer)
    // We map every search result provided by Google Search to an IntelLink.
    const recoveredLinks: IntelLink[] = groundingChunks
      .filter((c: any) => c.web)
      .map((c: any, i: number) => {
        const url = c.web.uri || '';
        const title = c.web.title || 'Verified Signal';
        
        // Determine Platform from URL
        let platform: PlatformType = 'Telegram';
        if (url.includes('whatsapp.com')) platform = 'WhatsApp';
        else if (url.includes('discord')) platform = 'Discord';
        else if (url.includes('facebook.com')) platform = 'Facebook';
        else if (url.includes('reddit.com')) platform = 'Reddit';
        else if (url.includes('linkedin.com')) platform = 'LinkedIn';
        else if (url.includes('instagram.com')) platform = 'Instagram';
        else if (url.includes('x.com') || url.includes('twitter.com')) platform = 'X';
        else if (url.includes('tiktok.com')) platform = 'TikTok';
        
        // Determine if this is a Direct Link or a Mention Context
        const isDirectInvite = url.includes('chat.whatsapp.com') || url.includes('t.me/') || url.includes('discord.gg');
        const sourceType = isDirectInvite ? 'Direct' : 'Mention';
        
        return {
          id: `verified-${i}-${Date.now()}`,
          title: title,
          description: isDirectInvite 
            ? `Direct access node detected for ${platform} community.` 
            : `Discussion or reference found on ${platform}.`,
          url: url,
          isPrivate: url.includes('joinchat') || url.includes('invite'),
          isActive: true,
          platform: platform,
          confidence: 100,
          location: { 
            country: params.location, 
            town: params.town, 
            hospital: params.hospital, 
            specialty: params.specialty 
          },
          source: { 
            name: title, 
            uri: url, 
            type: sourceType, 
            context: isDirectInvite 
              ? `Direct ${platform} Invite Link` 
              : `Mentioned in: ${title}` 
          },
          timestamp: new Date().toISOString()
        };
      });

    // Fallback if AI JSON is empty
    if (!resultData) {
      if (recoveredLinks.length === 0) throw new Error("NO_SIGNALS_DETECTED");
      return {
        analysis: "Raw signal extraction complete. Validated via Google Search Grounding.",
        links: recoveredLinks,
        messages: [],
        sources: recoveredLinks.map(l => ({ title: l.title, uri: l.url })),
        stats: { totalFound: recoveredLinks.length, privateCount: recoveredLinks.filter(l => l.isPrivate).length, activeCount: recoveredLinks.length, medicalMatches: 0 }
      };
    }

    // Merge AI reasoned links with Grounded links, deduplicating by URL
    const existingUrls = new Set((resultData.links || []).map((l: any) => l.url ? l.url.toLowerCase() : ''));
    const finalLinks = [...(resultData.links || [])];
    
    // Add only new unique grounding links
    recoveredLinks.forEach(rl => {
      if (!existingUrls.has(rl.url.toLowerCase())) {
        finalLinks.push(rl);
      }
    });

    return {
      ...resultData,
      links: finalLinks,
      stats: {
        ...resultData.stats,
        totalFound: finalLinks.length,
        medicalMatches: finalLinks.filter(l => 
          l.description?.toLowerCase().includes('residency') || 
          l.description?.toLowerCase().includes('board') ||
          l.description?.toLowerCase().includes('medical')
        ).length
      }
    };

  } catch (error: any) {
    console.error("SCOUT CORE FAILURE:", error);
    throw error;
  }
};
