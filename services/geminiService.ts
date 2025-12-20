
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
  // We don't just search the platform itself; we search for *mentions* of the platform's invite links on *other* networks.
  // Example: Searching for "t.me" (Telegram) links inside "twitter.com" threads.
  
  const platformSignatures: Record<string, string> = {
    'Telegram': '("t.me/+" OR "t.me/joinchat" OR "telegram.me" OR "telegram group")',
    'WhatsApp': '("chat.whatsapp.com" OR "whatsapp group")',
    'Discord': '("discord.gg" OR "discord.com/invite")',
    'Facebook': '(site:facebook.com/groups OR "facebook group")',
    'LinkedIn': '(site:linkedin.com/groups OR "linkedin group")',
    'X': '(site:x.com OR site:twitter.com)', // X is usually a source of links, not a destination for groups itself
    'Signal': '("signal.group")',
  };

  // 2. CONVERSATIONAL KEYWORDS (The "Human" Element)
  // Phrases people use when sharing or asking for links in threads/comments.
  const conversationalEnglish = '("anyone has link" OR "dm me link" OR "link in comments" OR "group link" OR "invite link" OR "joined" OR "discussion thread")';
  const conversationalArabic = '("رابط القروب" OR "تجمع" OR "مين عنده الرابط" OR "الرابط بالخاص" OR "قروب واتس" OR "قناة تليجرام" OR "رابط الدعوة")';
  const conversationLayer = `(${conversationalEnglish} OR ${conversationalArabic})`;

  // 3. TARGETED FOOTPRINTS (Simultaneous Search)
  // If user selects [Telegram, X], we search:
  // A) Telegram Index (t.me)
  // B) X Index (x.com)
  // C) X discussing Telegram (site:x.com "t.me")
  
  const activeSignatures = platforms.map(p => platformSignatures[p]).filter(Boolean).join(' OR ');
  const targetSites = platforms.map(p => {
      // Map platform names to their domains for "site:" operators
      if(p === 'Telegram') return 'site:t.me';
      if(p === 'WhatsApp') return 'site:whatsapp.com';
      if(p === 'Facebook') return 'site:facebook.com';
      if(p === 'LinkedIn') return 'site:linkedin.com';
      if(p === 'X') return '(site:twitter.com OR site:x.com)';
      if(p === 'Reddit') return 'site:reddit.com';
      if(p === 'Discord') return 'site:discord.com';
      return '';
  }).filter(Boolean).join(' OR ');

  // 4. SMART QUERY EXPANSION (Context Aware)
  let coreQuery = `"${query}"`;
  
  // Medical Context Expansion (Arabic/English)
  if (mode === 'medical-residency' || query.toLowerCase().includes('residency') || query.toLowerCase().includes('board')) {
      const specialty = medicalContext?.specialty || query;
      const level = medicalContext?.level || '';
      
      // Expand to include common acronyms and Arabic terms
      const arSpecialty = `("تجمع ${specialty}" OR "اطباء ${specialty}" OR "زمالة" OR "بورد")`;
      const enSpecialty = `("Saudi Board" OR "Arab Board" OR "SCFHS" OR "R1" OR "R2" OR "Resident" OR "Fellowship")`;
      
      coreQuery = `(${specialty} ${level}) (${arSpecialty} OR ${enSpecialty})`;
  }

  // 5. LOCATION LOCK
  const locStr = [location?.country, location?.city].filter(Boolean).map(s => `"${s}"`).join(' AND ');

  // 6. FINAL VECTOR ASSEMBLY
  // Logic: (Query + Expansion) AND (Location) AND ( (Target Sites) OR (Conversational Mentions of Targets) )
  
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
  
  // Create a context of "Authorized Accounts" to simulate deep access
  const authContext = params.identities.length > 0 
    ? `ACTIVE SESSIONS: ${params.identities.map(i => i.platform).join(', ')}. (Simulate access to public threads on these platforms).`
    : "MODE: PUBLIC WEB SCAN";

  console.log(`[VECTOR]:`, searchVector);

  const systemInstruction = `
    You are SCOUT OPS v7.5, an Elite Open Source Intelligence (OSINT) Engine.
    
    === OPERATIONAL GOAL ===
    Perform a SIMULTANEOUS MULTI-PLATFORM SCAN to find "Group Invite Links" and "Community Discussions".
    
    === SEARCH STRATEGY ===
    1. **CROSS-PLATFORM DISCOVERY**: You must look for links to one platform (e.g., Telegram) hidden inside discussions on another (e.g., Twitter Threads, Facebook Comments).
    2. **DEEP CONVERSATIONAL PARSING**: 
       - EXTRACT SENDER: Identify who posted the link (e.g., "@Ahmed99", "Admin", "Unknown User").
       - EXTRACT CONTEXT: Capture the message or tweet text surrounding the link.
    3. **MEDICAL INTELLIGENCE (Priority)**:
       - Context: "${params.medicalContext?.specialty || params.query}"
       - Look for terms: "R1", "Residents", "Saudi Board", "SCFHS", "تجمع", "قروب".
       - Prioritize "Official" or "Semi-Official" study groups.

    === OUTPUT REQUIREMENTS ===
    Return a raw JSON object. NO markdown formatting.
    
    Format:
    {
      "analysis": "Brief summary of where links were found.",
      "links": [
        {
          "title": "Page Title or Tweet Content",
          "url": "THE EXTRACTED URL (Prioritize the direct Invite Link if found, else the Discussion Link)",
          "platform": "The platform where the GROUP exists (Telegram, WhatsApp, etc.)",
          "type": "Group | Channel | Discussion Thread",
          "sharedBy": "Exact Name/Handle of the Sender (e.g. '@Dr_Ahmed', 'Facebook User')",
          "description": "Short summary of the group/page.",
          "context": "The actual message content where the link was shared (e.g., 'Here is the R1 group link you asked for...')",
          "confidence": 80-100,
          "status": "Active",
          "tags": ["Private", "Thread Reply", "Medical"] 
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

    // 1. Process Grounding Results (The "Raw" Hits)
    const verifiedLinks: IntelLink[] = grounding
      .filter((c: any) => c.web && c.web.uri)
      .map((c: any, i: number) => {
        const uri = c.web.uri;
        let platform: PlatformType = 'Telegram'; 
        let discoverySource = 'Web Index';

        // Intelligent Platform Detection
        if (uri.includes('t.me') || uri.includes('telegram')) platform = 'Telegram';
        else if (uri.includes('whatsapp')) platform = 'WhatsApp';
        else if (uri.includes('discord')) platform = 'Discord';
        else if (uri.includes('linkedin')) platform = 'LinkedIn';
        else if (uri.includes('facebook')) platform = 'Facebook';
        else if (uri.includes('twitter') || uri.includes('x.com')) { platform = 'X'; discoverySource = 'Twitter Thread'; }
        else if (uri.includes('instagram')) platform = 'Instagram';
        else if (uri.includes('reddit')) { platform = 'Reddit'; discoverySource = 'Reddit Discussion'; }

        // Determine if this is a "Container" (Thread) or "Target" (Group)
        let type: IntelLink['type'] = 'Group';
        if (platform === 'X' || platform === 'Reddit') type = 'Community'; // Typically a discussion *about* a group
        if (uri.includes('joinchat') || uri.includes('/+')) type = 'Group'; // Definitely a group

        // Auto-tagging based on URL structure
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
          source: discoverySource, // Where we found it
          sharedBy: "Public Index",
          tags: tags,
          location: params.location?.country || 'Global'
        };
      });

    // 2. Process AI Analysis (The "Deep" Hits - parsing context)
    const finalLinks: IntelLink[] = [...verifiedLinks];
    const seenUrls = new Set(verifiedLinks.map(l => l.url.toLowerCase()));

    if (rawData && rawData.links) {
      rawData.links.forEach((aiLink: any) => {
        // AI is better at identifying "Who shared it" and "Is it a reply?"
        const existingLink = finalLinks.find(l => l.url.toLowerCase() === aiLink.url?.toLowerCase());
        
        if (existingLink) {
          existingLink.sharedBy = aiLink.sharedBy;
          existingLink.description = aiLink.description;
          existingLink.context = aiLink.context;
          existingLink.type = aiLink.type; // Trust AI classification of "Thread" vs "Group"
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
            source: 'Deep Context Analysis', // Found by reading the page content/snippet
            sharedBy: aiLink.sharedBy || "Anonymous User",
            tags: aiLink.tags || [],
            location: aiLink.location || params.location?.country || 'Global'
          });
        }
      });
    }

    // 3. Post-Processing & Filtering
    const userMinConf = params.filters?.minConfidence || 0;
    
    // Filter logic: Ensure we show results that match requested platforms OR contain links to requested platforms
    const allowedPlatforms = new Set(params.platforms);
    let filteredLinks = finalLinks.filter(l => {
        if (l.confidence < userMinConf) return false;
        
        // If the link IS one of the requested platforms (e.g. t.me link) -> Keep it
        if (allowedPlatforms.has(l.platform)) return true;

        // If the link is a "Container" (e.g. Twitter Thread) that MIGHT contain the target -> Keep it
        if (l.platform === 'X' || l.platform === 'Reddit' || l.platform === 'Facebook') return true;

        return false;
    });

    // Sort by confidence
    filteredLinks.sort((a, b) => b.confidence - a.confidence);

    const platformDist: Record<string, number> = {};
    filteredLinks.forEach(l => {
      platformDist[l.platform] = (platformDist[l.platform] || 0) + 1;
    });

    return {
      analysis: rawData?.analysis || "Multi-platform scan complete. Cross-referenced conversational signals processed.",
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
