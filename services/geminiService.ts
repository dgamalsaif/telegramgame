
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

// --- ALGORITHM V2: DEEP CONVERSATIONAL VECTOR ---
const buildSearchVector = (params: SearchParams): string => {
  const { query, mode, platforms, location, medicalContext, identities } = params;
  
  // 1. PLATFORM DEFINITIONS & CONVERSATIONAL TARGETS
  const platformSignatures: Record<string, string> = {
    'Telegram': '("t.me/+" OR "t.me/joinchat" OR "telegram.me" OR "telegram group")',
    'WhatsApp': '("chat.whatsapp.com" OR "whatsapp group")',
    'Discord': '("discord.gg" OR "discord.com/invite")',
    'Facebook': '(site:facebook.com/groups OR "facebook group")',
    'LinkedIn': '(site:linkedin.com/groups OR "linkedin group")',
    'X': '(site:x.com OR site:twitter.com)', 
    'Signal': '("signal.group")',
  };

  // 2. CONVERSATIONAL KEYWORDS
  const conversationalEnglish = '("anyone has link" OR "dm me link" OR "link in comments" OR "group link" OR "invite link" OR "joined" OR "discussion thread")';
  const conversationalArabic = '("رابط القروب" OR "تجمع" OR "مين عنده الرابط" OR "الرابط بالخاص" OR "قروب واتس" OR "قناة تليجرام" OR "رابط الدعوة")';
  const conversationLayer = `(${conversationalEnglish} OR ${conversationalArabic})`;

  // 3. TARGETED FOOTPRINTS
  const activeSignatures = platforms.map(p => platformSignatures[p]).filter(Boolean).join(' OR ');
  const targetSites = platforms.map(p => {
      if(p === 'Telegram') return 'site:t.me';
      if(p === 'WhatsApp') return 'site:whatsapp.com';
      if(p === 'Facebook') return 'site:facebook.com';
      if(p === 'LinkedIn') return 'site:linkedin.com';
      if(p === 'X') return '(site:twitter.com OR site:x.com)';
      if(p === 'Reddit') return 'site:reddit.com';
      if(p === 'Discord') return 'site:discord.com';
      return '';
  }).filter(Boolean).join(' OR ');

  // 4. SMART QUERY EXPANSION
  let coreQuery = `"${query}"`;
  
  // Detect medical context automatically to support "any word"
  const isMedicalContext = mode === 'medical-residency' || 
                           query.toLowerCase().includes('residency') || 
                           query.toLowerCase().includes('board') ||
                           query.toLowerCase().includes('medical') ||
                           query.toLowerCase().includes('medicine') ||
                           query.toLowerCase().includes('doctor') ||
                           query.toLowerCase().includes('specialty');

  if (isMedicalContext) {
      const specialty = medicalContext?.specialty || query;
      const level = medicalContext?.level || '';
      
      // Dynamic Alias Generation (Generic & Specific)
      let enhancedSpecialty = `"${specialty}"`;
      const sLower = specialty.toLowerCase();

      // We keep optimized mappings for common requests, but fallback gracefully for ANY word
      if(sLower.includes('family') || sLower.includes('fam')) {
          enhancedSpecialty = '("Family Medicine" OR "FM" OR "Fam Med" OR "طب الأسرة" OR "طب أسرة")';
      } else if (sLower.includes('pedia')) {
          enhancedSpecialty = '("Pediatrics" OR "Pedia" OR "طب أطفال")';
      } else if (sLower.includes('internal') || sLower === 'im') {
           enhancedSpecialty = '("Internal Medicine" OR "IM" OR "الباطنة")';
      } else if (sLower.includes('surgery') || sLower === 'gs') {
           enhancedSpecialty = '("General Surgery" OR "GS" OR "جراحة عامة")';
      }

      // Generic context layer that works for ANY specialty word typed
      const enContext = `("Board" OR "Residency" OR "Fellowship" OR "Community" OR "Study Group" OR "Residents" OR "Exam Prep")`;
      const arContext = `("بورد" OR "زمالة" OR "تجمع" OR "أطباء" OR "قروب" OR "دراسة")`;
      
      coreQuery = `(${enhancedSpecialty} ${level}) (${enContext} OR ${arContext})`;
  }

  // 5. LOCATION LOCK
  const locStr = [location?.country, location?.city].filter(Boolean).map(s => `"${s}"`).join(' AND ');

  // 6. FINAL VECTOR
  const combinedVector = `
    ${coreQuery} 
    ${locStr} 
    (${targetSites} OR (${activeSignatures} ${conversationLayer}))
  `.replace(/\s+/g, ' ').trim();

  return combinedVector;
};

export const searchGlobalIntel = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const searchVector = buildSearchVector(params);
  
  const authContext = params.identities.length > 0 
    ? `PRIVILEGED ACCESS ENABLED: ${params.identities.map(i => {
        const type = i.connectionMethod === 'api_key' ? '[API KEY VERIFIED]' : i.connectionMethod === 'oauth_handshake' ? '[LIVE SESSION]' : '[SIMULATED]';
        return `${i.platform} (${type} User: ${i.value})`;
    }).join(', ')}. Treat these platforms as FULLY AUTHENTICATED.`
    : "ACCESS MODE: PUBLIC WEB INDEX ONLY";

  const systemInstruction = `
    You are SCOUT OPS v7.5, an Elite Open Source Intelligence (OSINT) Engine.
    ${authContext}
    
    === OPERATIONAL GOAL ===
    Perform a SIMULTANEOUS MULTI-PLATFORM SCAN to find "Group Invite Links" and "Community Discussions".
    
    === OUTPUT FORMAT ===
    Return a raw JSON object. 
    The 'analysis' field must be a structured TEXT REPORT (use \\n for new lines) with the following headers:
    [EXECUTIVE SUMMARY], [KEY INTEL], [STRATEGIC ASSESSMENT].
    
    Ensure the report analyzes the specific topic provided in the query ("${params.query}"), regardless of what it is.
    
    JSON Structure:
    {
      "analysis": "[EXECUTIVE SUMMARY]\\nBrief overview of findings for the requested topic.\\n\\n[KEY INTEL]\\nSpecific high-value targets found.\\n\\n[STRATEGIC ASSESSMENT]\\nAnalysis of the activity level and authenticity.",
      "links": [
        {
          "title": "Page Title",
          "url": "URL",
          "platform": "Platform",
          "type": "Group | Channel | Profile",
          "sharedBy": "Sender Handle",
          "description": "Short summary",
          "context": "Message context",
          "confidence": 85,
          "status": "Active",
          "tags": ["Verified", "Private"] 
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `[EXECUTE SIMULTANEOUS SCAN] Query: ${searchVector}`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }], 
      },
    });

    const rawData = parseSafeJSON(response.text);
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 1. Process Grounding Results
    const verifiedLinks: IntelLink[] = grounding
      .filter((c: any) => c.web && c.web.uri)
      .map((c: any, i: number) => {
        const uri = c.web.uri;
        let platform: PlatformType = 'Telegram'; 
        let discoverySource = 'Web Index';

        if (uri.includes('t.me') || uri.includes('telegram')) platform = 'Telegram';
        else if (uri.includes('whatsapp')) platform = 'WhatsApp';
        else if (uri.includes('discord')) platform = 'Discord';
        else if (uri.includes('linkedin')) platform = 'LinkedIn';
        else if (uri.includes('facebook')) platform = 'Facebook';
        else if (uri.includes('twitter') || uri.includes('x.com')) { platform = 'X'; discoverySource = 'Twitter Thread'; }
        else if (uri.includes('instagram')) platform = 'Instagram';
        else if (uri.includes('reddit')) { platform = 'Reddit'; discoverySource = 'Reddit Discussion'; }

        let type: IntelLink['type'] = 'Group';
        if (platform === 'X' || platform === 'Reddit') type = 'Community'; 
        if (uri.includes('joinchat') || uri.includes('/+')) type = 'Group';

        const tags = ['Verified'];
        if (uri.includes('/+') || uri.includes('joinchat')) tags.push('Private');
        if (uri.includes('status') && platform === 'X') tags.push('Thread');

        return {
          id: `g-${i}`,
          title: c.web.title || "Detected Signal",
          url: uri,
          description: "Signal detected via multi-platform scan.",
          context: "Direct web result",
          platform,
          type,
          status: 'Active',
          confidence: 90,
          source: discoverySource,
          sharedBy: "Public Index",
          tags: tags,
          location: params.location?.country || 'Global'
        };
      });

    // 2. Process AI Analysis
    const finalLinks: IntelLink[] = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(l => l.url.toLowerCase()));

    if (rawData && rawData.links) {
      rawData.links.forEach((aiLink: any) => {
        const existingLink = finalLinks.find(l => l.url.toLowerCase() === aiLink.url?.toLowerCase());
        
        if (existingLink) {
          existingLink.sharedBy = aiLink.sharedBy;
          existingLink.description = aiLink.description;
          existingLink.context = aiLink.context;
          existingLink.type = aiLink.type; 
          if (aiLink.tags) existingLink.tags = [...new Set([...existingLink.tags, ...aiLink.tags])];
        } else if (aiLink.url && !seenUrls.has(aiLink.url.toLowerCase())) {
          finalLinks.push({
            id: `ai-${Math.random()}`,
            title: aiLink.title || "Hidden Connection",
            description: aiLink.description,
            context: aiLink.context,
            url: aiLink.url,
            platform: aiLink.platform as PlatformType,
            type: aiLink.type || 'Group',
            status: 'Active',
            confidence: aiLink.confidence || 85, 
            source: 'Deep Context Analysis',
            sharedBy: aiLink.sharedBy || "Anonymous User",
            tags: aiLink.tags || [],
            location: aiLink.location || params.location?.country || 'Global'
          });
        }
      });
    }

    // 3. Post-Processing & Filtering
    const userMinConf = params.filters?.minConfidence || 0;
    const allowedPlatforms = new Set(params.platforms);
    let filteredLinks = finalLinks.filter(l => {
        if (l.confidence < userMinConf) return false;
        if (allowedPlatforms.has(l.platform)) return true;
        if (l.platform === 'X' || l.platform === 'Reddit' || l.platform === 'Facebook') return true;
        return false;
    });

    filteredLinks.sort((a, b) => b.confidence - a.confidence);

    const platformDist: Record<string, number> = {};
    filteredLinks.forEach(l => {
      platformDist[l.platform] = (platformDist[l.platform] || 0) + 1;
    });

    return {
      analysis: rawData?.analysis || "Scanning complete. Analysis data pending.",
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
