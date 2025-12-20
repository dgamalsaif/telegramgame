
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

// Advanced "Dork" Builder - Optimized for GROUPS & COMMUNITIES (No Documents)
const buildSearchVector = (params: SearchParams): string => {
  const { query, mode, scope, platforms, location, medicalContext, identities } = params;
  
  // 1. Define Platform Footprints (Prioritize Invite/Group URLs)
  const footprints: Record<string, string> = {
    'Telegram': '(site:t.me/joinchat OR site:t.me/+ OR site:telegram.me OR "t.me/")',
    'WhatsApp': '(site:chat.whatsapp.com)',
    'Discord': '(site:discord.gg OR site:discord.com/invite)',
    'Facebook': '(site:facebook.com/groups)',
    'LinkedIn': '(site:linkedin.com/groups OR "linkedin.com/groups")',
    'X': '(site:twitter.com OR site:x.com) ("join link" OR "group link" OR "whatsapp group" OR "telegram channel")',
    'Instagram': '(site:instagram.com)',
    'Reddit': '(site:reddit.com/r/)',
    'Signal': '(site:signal.group)',
    'TikTok': '(site:tiktok.com)'
  };

  const selectedFootprints = platforms.map(p => footprints[p]).join(' OR ');
  const platformScope = selectedFootprints ? `(${selectedFootprints})` : '';

  // 2. Location String (Strict Filter)
  const locStr = [location?.country, location?.city, location?.institution]
    .filter(Boolean)
    .map(s => `"${s}"`)
    .join(' AND ');

  // 3. Identity Augmentation
  const authKeywords = identities.length > 0 ? "OR \"private group\" OR \"confidential\"" : "";

  // 4. Scope Logic - STRICTLY GROUPS/CHANNELS
  let scopeKeywords = "";
  if (scope === 'channels') {
    scopeKeywords = '(channel OR broadcast OR "subscriber count" OR "join channel")';
  } else if (scope === 'events') {
    scopeKeywords = '(event OR webinar OR conference OR summit OR "register now")';
  } else if (scope === 'profiles') {
    scopeKeywords = '(profile OR bio OR "admin" OR "moderator") -inurl:group -inurl:chat';
  } else {
    // Default: Communities / Groups
    scopeKeywords = '(chat OR "join chat" OR "invite link" OR group OR community OR discussion OR forum OR "whatsapp group" OR "telegram group") -filetype:pdf -filetype:docx';
  }

  // 5. Query Expansion for Medical (Handled in System Instruction mostly, but added keywords here)
  let queryStr = `"${query}"`;
  
  // 6. Mode Specific Logic
  if (mode === 'username') {
    return `"${query}" ${platformScope} -site:?*`;
  }
  
  if (mode === 'phone') {
    return `"${query}" OR "${query.replace('+', '')}" OR "tel:${query}" ${platformScope}`;
  }

  if (mode === 'medical-residency') {
    const specialty = medicalContext?.specialty || '';
    const level = medicalContext?.level || 'Residency';
    // Ensure we look for the specialty AND the group keywords
    return `"${specialty}" "${level}" ${locStr} ${platformScope} (group OR community OR "fellowship chat" OR "residents group") ${scopeKeywords}`;
  }

  // General Search
  return `${queryStr} ${locStr} ${platformScope} ${scopeKeywords} ${authKeywords}`;
};

export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const searchVector = buildSearchVector(params);
  
  const identityContext = params.identities.map(id => `[${id.platform.toUpperCase()} UPLINK: ${id.value}]`).join(' + ');
  const authLevel = params.identities.length > 0 ? "LEVEL_2_AUTHORIZED (DEEP SCAN)" : "LEVEL_1_PUBLIC";

  console.log(`[${authLevel}] VECTOR:`, searchVector);

  const systemInstruction = `
    You are SCOUT OPS v7.5, a specialized Intelligence Engine focusing on Social Media Groups & Communities.
    
    === MISSION DIRECTIVES ===
    1. **TARGET**: Find ACTIVE Group Links (Telegram, WhatsApp, Discord, Facebook Groups) and Community Profiles.
    2. **EXCLUSION**: Do NOT return generic documents (PDFs, DOCs) or articles unless they contain a DIRECT Invite Link.
    3. **MEDICAL EXPANSION**: If the query is a medical specialty (e.g., 'pediatric'), YOU MUST AUTOMATICALLY SEARCH FOR ITS SUB-SPECIALTIES (e.g., 'neonatology', 'pediatric oncology', 'PICU', 'child health') within the target platforms.
    4. **SOURCE IDENTIFICATION**: You MUST identify WHO shared the link. Was it an 'Official Account', a 'Community Admin', a 'University Page', or a 'User Message'?
    5. **GEO-FENCING**: Strictly apply the location filters: ${params.location?.country || 'Global'} ${params.location?.city || ''}.

    === INPUT PARAMETERS ===
    QUERY: "${params.query}"
    MODE: ${params.mode}
    LOCATION: ${JSON.stringify(params.location)}

    === OUTPUT FORMAT (JSON) ===
    {
      "analysis": "Briefing on the density of groups found, specific sub-specialties identified, and the primary source of these links.",
      "links": [
        {
          "title": "Group Name or Page Title",
          "url": "Direct URL to Group/Profile",
          "platform": "Platform Name",
          "type": "Group|Channel|Community|Event",
          "sharedBy": "Exact name of the Account/Community that shared this link",
          "description": "Content summary.",
          "location": "Inferred Location",
          "confidence": 80-100,
          "status": "Active"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `[EXECUTE_GROUP_HUNT] Pattern: ${searchVector}`,
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
        let platform: PlatformType = 'Telegram'; 
        
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
        // Infer type strictly for Groups/Communities
        if (uri.includes('channel') || (platform === 'Telegram' && !uri.includes('joinchat'))) type = 'Channel';
        else if (platform === 'LinkedIn' && uri.includes('/groups/')) type = 'Group';
        else if (platform === 'Facebook' && uri.includes('/groups/')) type = 'Group';
        else type = 'Group';

        if (params.scope === 'channels') type = 'Channel';
        if (params.scope === 'events') type = 'Event';

        return {
          id: `g-${i}`,
          title: c.web.title || "Intercepted Signal",
          url: uri,
          description: "Verified community signal.",
          platform,
          type,
          status: 'Active',
          confidence: 100,
          source: 'Live Grounding',
          sharedBy: "Direct Search Result", // Grounding often lacks context of "who shared", AI analysis fills this better
          tags: ['Verified', 'Live'],
          location: params.location?.country || 'Global'
        };
      });

    // 2. Merge with AI Analysis (which has better context on 'sharedBy')
    const finalLinks: IntelLink[] = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(l => l.url.toLowerCase()));

    if (rawData && rawData.links) {
      rawData.links.forEach((aiLink: any) => {
        // We prioritize AI links here because they contain the 'sharedBy' intelligence requested by the user
        // If the URL matches a grounding link, update the grounding link with AI details
        const existingLink = finalLinks.find(l => l.url.toLowerCase() === aiLink.url?.toLowerCase());
        
        if (existingLink) {
          existingLink.sharedBy = aiLink.sharedBy || "Community Network";
          existingLink.description = aiLink.description;
        } else if (aiLink.url && !seenUrls.has(aiLink.url.toLowerCase())) {
          finalLinks.push({
            id: `ai-${Math.random()}`,
            title: aiLink.title,
            description: aiLink.description,
            url: aiLink.url,
            platform: aiLink.platform as PlatformType,
            type: aiLink.type || 'Group',
            status: 'Active',
            confidence: aiLink.confidence || 80, 
            source: 'Deep Analysis',
            sharedBy: aiLink.sharedBy || "Aggregated Source",
            tags: ['AI_Inferred'],
            location: aiLink.location || params.location?.country || 'Global'
          });
        }
      });
    }

    // 3. Filtering
    const userMinConf = params.filters?.minConfidence || 0;
    let filteredLinks = finalLinks.filter(l => l.confidence >= userMinConf);
    
    filteredLinks = filteredLinks.filter(l => params.platforms.includes(l.platform));

    const platformDist: Record<string, number> = {};
    filteredLinks.forEach(l => {
      platformDist[l.platform] = (platformDist[l.platform] || 0) + 1;
    });

    return {
      analysis: rawData?.analysis || "Group scan complete. Targets identified.",
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
