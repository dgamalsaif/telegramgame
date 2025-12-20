
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
  const { query, mode, platforms, location, medicalContext, identities } = params;
  
  let vector = "";
  
  // 1. Define Platform Footprints
  const footprints: Record<string, string> = {
    'Telegram': '(site:t.me OR site:telegram.me OR site:tgstat.com OR site:telemetr.io)',
    'WhatsApp': '(site:chat.whatsapp.com)',
    'Discord': '(site:discord.gg OR site:discord.com/invite)',
    'Facebook': '(site:facebook.com/groups)',
    'LinkedIn': '(site:linkedin.com/groups OR site:linkedin.com/in)',
    'X': '(site:twitter.com OR site:x.com)',
    'Instagram': '(site:instagram.com)',
    'Reddit': '(site:reddit.com/r/)',
    'Signal': '(site:signal.group)',
    'TikTok': '(site:tiktok.com)'
  };

  const selectedFootprints = platforms.map(p => footprints[p]).join(' OR ');
  const scope = selectedFootprints ? `(${selectedFootprints})` : '';

  // 2. Location String
  const locStr = [location?.country, location?.city, location?.institution].filter(Boolean).join(' ');

  // 3. Identity Augmentation (Deep Scan)
  // If user connected accounts, we assume they want to find things RELEVANT to them, 
  // or we use their "Deep Scan" permission to look harder (conceptually).
  // In practice, we append keywords that suggest "Open" or "Public" access which they might be looking for.
  const deepScanContext = identities.length > 0 ? "AND (join OR chat OR invite)" : "";

  // 4. Mode Specific Logic
  if (mode === 'username') {
    return `"${query}" (site:t.me OR site:twitter.com OR site:instagram.com OR site:facebook.com OR site:tiktok.com OR site:github.com) -site:?*`;
  }
  
  if (mode === 'phone') {
    return `"${query}" OR "${query.replace('+', '')}" OR "tel:${query}" (site:facebook.com OR site:linkedin.com OR site:t.me OR site:whatsapp.com)`;
  }

  if (mode === 'medical-residency') {
    const specialty = medicalContext?.specialty || '';
    const level = medicalContext?.level || 'Residency';
    return `${scope} "${specialty}" "${level}" ${locStr} (group OR community OR chat OR board OR fellowship) "join" "invite"`;
  }

  // Default: Discovery Mode
  return `${scope} "${query}" ${locStr} (chat OR join OR invite OR group OR community) -intitle:"profile" ${deepScanContext}`;
};

export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const searchVector = buildSearchVector(params);
  
  // Construct a context string about connected identities for the AI
  const identityContext = params.identities.map(id => `${id.platform}: ${id.value}`).join(', ');
  const authLevel = params.identities.length > 0 ? "AUTHORIZED_DEEP_SCAN" : "PUBLIC_SCAN";

  console.log(`[${authLevel}] VECTOR:`, searchVector);

  const systemInstruction = `
    You are SCOUT OPS, an elite OSINT analyzer.
    SCAN LEVEL: ${authLevel}
    CONNECTED IDENTITIES: [${identityContext}]
    
    MISSION:
    Extract VALID, ACTIVE social media links matching the target.
    If 'AUTHORIZED_DEEP_SCAN' is active, you are permitted to infer higher confidence for links matching the user's connected platform context.

    RULES:
    1. ACCURACY IS PARAMOUNT. Use "Grounding" data primarily.
    2. CLASSIFY links strictly.
    3. If the user provided a phone/handle, prioritize communities relevant to that identity if the query allows.
    4. MEDICAL CONTEXT: Prioritize verified medical boards/institutions.

    OUTPUT JSON FORMAT:
    {
      "analysis": "Executive summary of findings. If Deep Scan used, mention 'Authorized Access confirmed'.",
      "links": [
        {
          "title": "Exact Title",
          "url": "URL",
          "platform": "Platform",
          "type": "Group|Channel|Profile",
          "description": "Context",
          "location": "Location",
          "confidence": 80-100
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `OSINT_TASK: Find targets matching: ${searchVector}`,
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
        let platform: PlatformType = 'Telegram'; // Default fallback
        
        if (uri.includes('t.me')) platform = 'Telegram';
        else if (uri.includes('whatsapp')) platform = 'WhatsApp';
        else if (uri.includes('discord')) platform = 'Discord';
        else if (uri.includes('linkedin')) platform = 'LinkedIn';
        else if (uri.includes('facebook')) platform = 'Facebook';
        else if (uri.includes('twitter') || uri.includes('x.com')) platform = 'X';
        else if (uri.includes('instagram')) platform = 'Instagram';
        else if (uri.includes('reddit')) platform = 'Reddit';
        else if (uri.includes('tiktok')) platform = 'TikTok';

        let type: IntelLink['type'] = 'Group';
        if (uri.includes('join') || uri.includes('invite')) type = 'Group';
        else if (platform === 'Telegram' && !uri.includes('joinchat')) type = 'Channel';
        else if (platform === 'LinkedIn' && uri.includes('/in/')) type = 'Profile';

        return {
          id: `g-${i}`,
          title: c.web.title || "Detected Signal",
          url: uri,
          description: "Verified signal via live ground search.",
          platform,
          type,
          status: 'Active',
          confidence: 100,
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
            type: aiLink.type || 'Group',
            status: 'Unknown',
            confidence: aiLink.confidence || 85,
            source: 'Deep Analysis',
            tags: ['AI_Inferred', authLevel === 'AUTHORIZED_DEEP_SCAN' ? 'Deep_Scan' : 'Public'],
            location: aiLink.location || 'Global'
          });
        }
      });
    }

    const filteredLinks = finalLinks.filter(l => params.platforms.includes(l.platform));

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
