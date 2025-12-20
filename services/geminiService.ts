
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
  const { query, mode, platforms, location, medicalContext } = params;
  
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

  // 3. Mode Specific Logic
  if (mode === 'username') {
    // Looking for specific handle across platforms
    return `"${query}" (site:t.me OR site:twitter.com OR site:instagram.com OR site:facebook.com OR site:tiktok.com OR site:github.com) -site:?*`;
  }
  
  if (mode === 'phone') {
    // Phone number reverse lookup format
    return `"${query}" OR "${query.replace('+', '')}" OR "tel:${query}" (site:facebook.com OR site:linkedin.com OR site:t.me OR site:whatsapp.com)`;
  }

  if (mode === 'medical-residency') {
    // High-context medical search
    const specialty = medicalContext?.specialty || '';
    const level = medicalContext?.level || 'Residency';
    return `${scope} "${specialty}" "${level}" ${locStr} (group OR community OR chat OR board OR fellowship) "join" "invite"`;
  }

  // Default: Discovery Mode
  // We explicitly ask for "chat" or "join" keywords to find invite links
  return `${scope} "${query}" ${locStr} (chat OR join OR invite OR group OR community) -intitle:"profile"`;
};

export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const searchVector = buildSearchVector(params);
  
  console.log("EXECUTING VECTOR:", searchVector);

  const systemInstruction = `
    You are SCOUT OPS, an elite OSINT (Open Source Intelligence) analyzer. 
    Your mission is to extract VALID, ACTIVE social media links from search results.

    RULES:
    1. ACCURACY IS PARAMOUNT. Do not hallucinate links. Use the provided "Grounding" data.
    2. CLASSIFY links strictly (Group, Channel, Profile).
    3. FILTER out broken or irrelevant results.
    4. IF searching by username, find profiles. IF searching by topic, find groups/chats.
    5. MEDICAL CONTEXT: If looking for residency/fellowship, prioritize official board groups or study communities.

    OUTPUT JSON FORMAT:
    {
      "analysis": "Executive summary of findings, mentioning key regions or platforms found.",
      "links": [
        {
          "title": "Exact Title from Source",
          "url": "THE_ACTUAL_URL",
          "platform": "Telegram/WhatsApp/etc",
          "type": "Group|Channel|Profile",
          "description": "Context about this link (e.g., 'Cardiology Residency Batch 2024')",
          "location": "Inferred location (e.g., 'Saudi Arabia', 'Egypt', 'Global')",
          "confidence": 80-100
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash is faster/better for search aggregation
      contents: `OSINT_TASK: Find targets matching: ${searchVector}`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }], 
      },
    });

    const rawData = parseSafeJSON(response.text);
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 1. Extract Links from Grounding (The Truth Source)
    // We prioritize these because they are real-time validated by Google Search
    const verifiedLinks: IntelLink[] = grounding
      .filter((c: any) => c.web && c.web.uri)
      .map((c: any, i: number) => {
        const uri = c.web.uri;
        let platform: PlatformType = 'Telegram'; // Default fallback
        
        // Simple classifier
        if (uri.includes('t.me')) platform = 'Telegram';
        else if (uri.includes('whatsapp')) platform = 'WhatsApp';
        else if (uri.includes('discord')) platform = 'Discord';
        else if (uri.includes('linkedin')) platform = 'LinkedIn';
        else if (uri.includes('facebook')) platform = 'Facebook';
        else if (uri.includes('twitter') || uri.includes('x.com')) platform = 'X';
        else if (uri.includes('instagram')) platform = 'Instagram';
        else if (uri.includes('reddit')) platform = 'Reddit';
        else if (uri.includes('tiktok')) platform = 'TikTok';

        // Determine Type
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
          tags: ['Verified'],
          location: params.location?.country || 'Global'
        };
      });

    // 2. Merge with AI Analysis (The Context Source)
    // The AI might find context the raw chunk metadata missed
    const finalLinks: IntelLink[] = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(l => l.url.toLowerCase()));

    if (rawData && rawData.links) {
      rawData.links.forEach((aiLink: any) => {
        if (aiLink.url && !seenUrls.has(aiLink.url.toLowerCase())) {
          // Verify it matches one of our requested platforms if strict
          // For now, we allow it but mark confidence slightly lower
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
            tags: ['AI_Inferred'],
            location: aiLink.location || 'Global'
          });
        }
      });
    }

    // Filter Logic: If user requested specific platforms, filter results
    const filteredLinks = finalLinks.filter(l => params.platforms.includes(l.platform));

    // Stats Generation
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
