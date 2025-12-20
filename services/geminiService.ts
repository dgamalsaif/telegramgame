
import { GoogleGenAI } from "@google/genai";
import { SearchResult, IntelLink, SearchParams, PlatformType } from "../types";

// Helper to clean JSON output from AI
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
    return null;
  }
};

// --- ALGORITHM V4: HYPER-SPEED VECTOR ---
const buildSearchVector = (params: SearchParams): string => {
  const { query, mode, scope, platforms, location, medicalContext } = params;
  
  // 1. AGGRESSIVE PLATFORM SIGNATURES
  // We use specific operators to target invite URLs directly
  const directLinkPatterns: Record<string, string> = {
    'Telegram': '(site:t.me OR site:telegram.me OR "t.me/+" OR "t.me/joinchat")',
    'WhatsApp': '(site:chat.whatsapp.com OR "chat.whatsapp.com")',
    'Discord': '(site:discord.com/invite OR site:discord.gg OR "discord.gg")',
    'Facebook': '(site:facebook.com/groups)',
    'LinkedIn': '(site:linkedin.com/groups)',
    'Signal': '(site:signal.group)',
    'Reddit': '(site:reddit.com)',
    'X': '(site:x.com OR site:twitter.com)',
  };

  // 2. SCOPE TARGETING (Optimized for Communities/Channels)
  let scopeKeywords = '';
  if (scope === 'channels') {
     scopeKeywords = '("channel" OR "broadcast" OR "feed")';
     if (platforms.includes('Telegram')) directLinkPatterns['Telegram'] = '(site:t.me/s/ OR "t.me") -joinchat';
  } else if (scope === 'communities' || scope === 'events') {
     scopeKeywords = '("group" OR "chat" OR "community" OR "discussion" OR "thread")';
     // Force join links for communities
     if (platforms.includes('Telegram')) directLinkPatterns['Telegram'] = '(site:t.me/joinchat OR site:t.me/+)';
  } else {
     scopeKeywords = '("profile" OR "bio" OR "contact")';
  }

  // 3. PLATFORM SELECTION
  const activePlatforms = platforms.length > 0 ? platforms : ['Telegram', 'WhatsApp', 'Discord'];
  const targetSites = activePlatforms
    .map(p => directLinkPatterns[p] || `"${p}"`) 
    .join(' OR ');

  // 4. DISCOVERY LAYER (Finding links on 3rd party sites)
  const discoveryKeywords = `("invite link" OR "join group" OR "group link" OR "discord invite" OR "whatsapp link")`;

  // 5. SMART MEDICAL CONTEXT (Auto-Inject)
  let coreQuery = `"${query}"`;
  
  const isMedicalContext = mode === 'medical-residency' || 
                           /medical|medicine|doctor|board|residency|specialty|health|clinic|hospital|pharmacy|dentist/i.test(query);

  if (isMedicalContext) {
      const specialty = medicalContext?.specialty || query;
      const sLower = specialty.toLowerCase();
      let enhancedSpecialty = `"${specialty}"`;

      // Fast Alias Mapping
      if(sLower.includes('family') || sLower.includes('fam')) enhancedSpecialty = '("Family Medicine" OR "FM" OR "طب الأسرة")';
      else if (sLower.includes('pedia')) enhancedSpecialty = '("Pediatrics" OR "Pedia" OR "طب أطفال")';
      else if (sLower.includes('internal') || sLower === 'im') enhancedSpecialty = '("Internal Medicine" OR "IM" OR "الباطنة")';
      else if (sLower.includes('surgery') || sLower === 'gs') enhancedSpecialty = '("General Surgery" OR "GS" OR "جراحة")';

      const contextKeywords = `("Board" OR "Residency" OR "Fellowship" OR "Group" OR "بورد" OR "تجمع" OR "قروب")`;
      
      // If query is generic, we replace it. If specific, we append context.
      coreQuery = query.length < 3 ? `(${enhancedSpecialty} ${contextKeywords})` : `("${query}" AND ${contextKeywords})`;
  }

  // 6. LOCATION LOCK
  const locStr = [location?.country, location?.city].filter(Boolean).map(s => `"${s}"`).join(' AND ');

  // 7. FINAL VECTOR
  // Priority: Query AND (Direct Sites OR Discovery)
  return `
    ${coreQuery} 
    ${locStr} 
    ${scopeKeywords}
    (${targetSites} OR ${discoveryKeywords})
  `.replace(/\s+/g, ' ').trim();
};

export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const searchVector = buildSearchVector(params);
  
  // MINIMALIST INSTRUCTION FOR MAXIMUM SPEED
  const systemInstruction = `
    ROLE: OSINT LINK EXTRACTOR.
    TARGET: Find DIRECT INVITE LINKS (Telegram, WhatsApp, Discord) for: "${params.query}".
    
    OUTPUT: STRICT JSON ONLY. NO MARKDOWN.
    Format:
    {
      "analysis": "Generate a 'MISSION REPORT' with headers: [EXECUTIVE SUMMARY], [KEY INTEL], [STRATEGIC ASSESSMENT]. Be concise.",
      "links": [
        {
          "title": "Title of Group/Channel",
          "url": "Direct URL",
          "platform": "Telegram|WhatsApp|Discord|etc",
          "type": "Group|Channel|Community",
          "description": "Brief context",
          "confidence": 95,
          "status": "Active",
          "tags": ["Direct Link", "Verified"]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash model is fastest
      contents: `SCAN QUERY: ${searchVector}`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }], 
        temperature: 0.3, // Lower temperature for more deterministic/faster results
      },
    });

    const rawData = parseSafeJSON(response.text);
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 1. Process Web Results (Fastest Path)
    const verifiedLinks: IntelLink[] = grounding
      .filter((c: any) => c.web && c.web.uri)
      .map((c: any, i: number) => {
        const uri = c.web.uri;
        let platform: PlatformType = 'Telegram'; 
        let isDirect = false;

        if (uri.includes('t.me') || uri.includes('telegram')) { platform = 'Telegram'; isDirect = true; }
        else if (uri.includes('whatsapp') || uri.includes('chat.whatsapp')) { platform = 'WhatsApp'; isDirect = true; }
        else if (uri.includes('discord')) { platform = 'Discord'; isDirect = true; }
        else if (uri.includes('linkedin')) platform = 'LinkedIn';
        else if (uri.includes('facebook')) platform = 'Facebook';
        else if (uri.includes('x.com') || uri.includes('twitter')) platform = 'X';
        else if (uri.includes('instagram')) platform = 'Instagram';
        else if (uri.includes('reddit')) platform = 'Reddit';
        else if (uri.includes('signal')) platform = 'Signal';

        return {
          id: `g-${i}`,
          title: c.web.title || `${platform} Signal`,
          url: uri,
          description: isDirect ? "Direct Invite Link Identified" : "Source Page containing relevant intel",
          context: "Web Scan",
          platform,
          type: params.scope === 'channels' ? 'Channel' : 'Group',
          status: 'Active',
          confidence: isDirect ? 98 : 80,
          source: "Live Index",
          sharedBy: "Web",
          tags: isDirect ? ['Direct Link'] : ['Source'],
          location: params.location?.country || 'Global'
        };
      });

    // 2. Merge AI Insights
    let finalLinks = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(l => l.url.toLowerCase()));

    if (rawData && rawData.links) {
      rawData.links.forEach((aiLink: any) => {
        if (!aiLink.url) return;
        if (!seenUrls.has(aiLink.url.toLowerCase())) {
           finalLinks.push({
             ...aiLink,
             id: `ai-${Math.random()}`,
             confidence: aiLink.confidence || 85,
             tags: aiLink.tags || ['Analyst Inferred']
           });
        }
      });
    }

    // 3. Fast Filter
    const userMinConf = params.filters?.minConfidence || 0;
    const allowed = new Set(params.platforms.length > 0 ? params.platforms : ['Telegram', 'WhatsApp', 'Discord']);
    
    finalLinks = finalLinks.filter(l => {
        if (l.confidence < userMinConf) return false;
        // Always include target platforms + major aggregators
        return allowed.has(l.platform) || ['Reddit', 'X', 'Facebook'].includes(l.platform);
    });

    // Sort: Direct Links first
    finalLinks.sort((a, b) => {
       const aScore = (a.tags.includes('Direct Link') ? 100 : 0) + a.confidence;
       const bScore = (b.tags.includes('Direct Link') ? 100 : 0) + b.confidence;
       return bScore - aScore;
    });

    return {
      analysis: rawData?.analysis || "Scan complete. Intel compiled.",
      links: finalLinks,
      stats: {
        total: finalLinks.length,
        platformDistribution: {}, 
        topLocations: []
      }
    };

  } catch (error) {
    console.error("ENGINE ERROR:", error);
    throw error;
  }
};
