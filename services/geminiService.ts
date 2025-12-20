
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

// Advanced "Dork" Builder
const buildSearchVector = (params: SearchParams): string => {
  const { query, mode, scope, platforms, location, medicalContext, identities } = params;
  
  // 1. Define Platform Footprints
  const footprints: Record<string, string> = {
    'Telegram': '(site:t.me OR site:telegram.me OR site:tgstat.com OR site:telemetr.io)',
    'WhatsApp': '(site:chat.whatsapp.com)',
    'Discord': '(site:discord.gg OR site:discord.com/invite)',
    'Facebook': '(site:facebook.com/groups)',
    'LinkedIn': '(site:linkedin.com/groups OR site:linkedin.com/in OR site:linkedin.com/posts)',
    'X': '(site:twitter.com OR site:x.com)',
    'Instagram': '(site:instagram.com)',
    'Reddit': '(site:reddit.com/r/)',
    'Signal': '(site:signal.group)',
    'TikTok': '(site:tiktok.com)'
  };

  const selectedFootprints = platforms.map(p => footprints[p]).join(' OR ');
  const platformScope = selectedFootprints ? `(${selectedFootprints})` : '';

  // 2. Location String
  const locStr = [location?.country, location?.city, location?.institution].filter(Boolean).map(s => `"${s}"`).join(' AND ');

  // 3. Identity Augmentation (Deep Scan)
  // If authorized, we widen the net to include "hidden" or "private" keywords that might appear in public index leaks
  const authKeywords = identities.length > 0 ? "OR \"private group\" OR \"confidential\"" : "";

  // 4. Scope Logic (The "Any Field" handler)
  let scopeKeywords = "";
  if (scope === 'documents') {
    scopeKeywords = '(filetype:pdf OR filetype:docx OR filetype:xlsx OR "google drive" OR "dropbox" OR "webalizer")';
  } else if (scope === 'events') {
    scopeKeywords = '(event OR webinar OR conference OR summit OR "save the date")';
  } else if (scope === 'profiles') {
    scopeKeywords = '(profile OR bio OR "connect with me" OR "my account") -inurl:group -inurl:chat';
  } else {
    // Default: Communities
    scopeKeywords = '(chat OR join OR invite OR group OR community OR discussion OR forum)';
  }

  // 5. Mode Specific Logic
  if (mode === 'username') {
    return `"${query}" ${platformScope} -site:?*`;
  }
  
  if (mode === 'phone') {
    return `"${query}" OR "${query.replace('+', '')}" OR "tel:${query}" ${platformScope}`;
  }

  if (mode === 'medical-residency') {
    const specialty = medicalContext?.specialty || '';
    const level = medicalContext?.level || 'Residency';
    return `"${specialty}" "${level}" ${locStr} ${platformScope} (group OR board OR fellowship OR match OR "program director") ${scopeKeywords}`;
  }

  // Default: Discovery Mode
  return `"${query}" ${locStr} ${platformScope} ${scopeKeywords} ${authKeywords}`;
};

export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const searchVector = buildSearchVector(params);
  
  // Construct a context string about connected identities for the AI
  const identityContext = params.identities.map(id => `${id.platform}: ${id.value}`).join(', ');
  const authLevel = params.identities.length > 0 ? "AUTHORIZED_DEEP_SCAN" : "PUBLIC_SCAN";

  console.log(`[${authLevel}] VECTOR:`, searchVector);

  const systemInstruction = `
    You are SCOUT OPS v7.5, the ultimate OSINT intelligence engine.
    
    CONTEXT:
    - SCAN LEVEL: ${authLevel}
    - IDENTITIES: [${identityContext}]
    - SCOPE: ${params.scope.toUpperCase()}
    - TARGET: ${params.query}
    
    MISSION:
    Search for valid, accessible links matching the criteria.
    If searching for 'documents', look for PDF/Doc links.
    If searching for 'communities', look for invite links.
    
    STRICT RULES:
    1. ZERO HALLUCINATIONS. Use Grounding data (Google Search) as the primary source of truth.
    2. If a link comes from the 'Deep Analysis' capability (AI knowledge), mark it with slightly lower confidence unless verified.
    3. ACCURACY: Filter out broken links or generic landing pages. We want the DIRECT resource (Group Link, PDF Link, Profile Link).
    4. Categorize results based on the User's Scope (e.g., if they asked for 'documents', label the Type as 'Document').

    OUTPUT JSON:
    {
      "analysis": "A professional intelligence briefing summarizing what was found, key locations, and data density.",
      "links": [
        {
          "title": "Resource Title",
          "url": "URL",
          "platform": "Platform Source",
          "type": "Group|Channel|Profile|Document|Event",
          "description": "Brief description of contents.",
          "location": "Inferred Location",
          "confidence": 85-100
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `[EXECUTE_OSINT_QUERY] Pattern: ${searchVector}`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }], 
      },
    });

    const rawData = parseSafeJSON(response.text);
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 1. Extract Links from Grounding
    const verifiedLinks: IntelLink[] = grounding
      .filter((c: any) => c.web && c.web.uri)
      .map((c: any, i: number) => {
        const uri = c.web.uri;
        let platform: PlatformType = 'Telegram'; // Default fallback or "Web"
        
        if (uri.includes('t.me')) platform = 'Telegram';
        else if (uri.includes('whatsapp')) platform = 'WhatsApp';
        else if (uri.includes('discord')) platform = 'Discord';
        else if (uri.includes('linkedin')) platform = 'LinkedIn';
        else if (uri.includes('facebook')) platform = 'Facebook';
        else if (uri.includes('twitter') || uri.includes('x.com')) platform = 'X';
        else if (uri.includes('instagram')) platform = 'Instagram';
        else if (uri.includes('reddit')) platform = 'Reddit';
        else if (uri.includes('tiktok')) platform = 'TikTok';

        // Determine Type based on URI structure & Scope
        let type: IntelLink['type'] = 'Group';
        
        if (params.scope === 'documents') type = 'Document';
        else if (params.scope === 'events') type = 'Event';
        else if (params.scope === 'profiles') type = 'Profile';
        else {
           if (uri.includes('join') || uri.includes('invite')) type = 'Group';
           else if (platform === 'Telegram' && !uri.includes('joinchat')) type = 'Channel';
           else if (platform === 'LinkedIn' && uri.includes('/in/')) type = 'Profile';
        }

        return {
          id: `g-${i}`,
          title: c.web.title || "Intercepted Signal",
          url: uri,
          description: "Verified signal via live ground search.",
          platform,
          type,
          status: 'Active',
          confidence: 100, // MAX CONFIDENCE FOR GROUNDED RESULTS
          source: 'Live Grounding',
          tags: ['Verified', 'Live'],
          location: params.location?.country || 'Global'
        };
      });

    // 2. Merge with AI Analysis
    const finalLinks: IntelLink[] = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(l => l.url.toLowerCase()));

    if (rawData && rawData.links) {
      rawData.links.forEach((aiLink: any) => {
        if (aiLink.url && !seenUrls.has(aiLink.url.toLowerCase())) {
          finalLinks.push({
            id: `ai-${Math.random()}`,
            title: aiLink.title,
            description: aiLink.description,
            url: aiLink.url,
            platform: aiLink.platform as PlatformType,
            type: aiLink.type || params.scope === 'documents' ? 'Document' : 'Group',
            status: 'Unknown',
            confidence: aiLink.confidence || 70, // LOWER DEFAULT FOR AI HALLUCINATIONS
            source: 'Deep Analysis',
            tags: ['AI_Inferred', authLevel === 'AUTHORIZED_DEEP_SCAN' ? 'Deep_Scan' : 'Public'],
            location: aiLink.location || 'Global'
          });
        }
      });
    }

    // 3. Filtering & Thresholding
    const CONFIDENCE_THRESHOLD = 60;
    
    let filteredLinks = finalLinks.filter(l => l.confidence >= CONFIDENCE_THRESHOLD);

    // Filter by Platform if it's strictly a social search, otherwise allow web results for docs
    filteredLinks = params.scope === 'documents' 
      ? filteredLinks 
      : filteredLinks.filter(l => params.platforms.includes(l.platform));

    // Calculate Stats
    const platformDist: Record<string, number> = {};
    filteredLinks.forEach(l => {
      platformDist[l.platform] = (platformDist[l.platform] || 0) + 1;
    });

    return {
      analysis: rawData?.analysis || "Search complete. Reviewing signal integrity.",
      links: filteredLinks,
      stats: {
        total: filteredLinks.length,
        platformDistribution: platformDist,
        topLocations: [params.location?.country || 'Global']
      }
    };

  } catch (error) {
    console.error("OSINT ENGINE FAILURE:", error);
    throw error;
  }
};
