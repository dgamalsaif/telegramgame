
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, IntelligenceSignal, SearchParams, PlatformType } from "../types";

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

const identifyPlatform = (url: string): PlatformType => {
  const u = url.toLowerCase();
  if (u.includes('t.me') || u.includes('telegram')) return 'Telegram';
  if (u.includes('whatsapp') || u.includes('wa.me')) return 'WhatsApp';
  if (u.includes('discord')) return 'Discord';
  if (u.includes('facebook') || u.includes('fb.com')) return 'Facebook';
  if (u.includes('instagram')) return 'Instagram';
  if (u.includes('linkedin')) return 'LinkedIn';
  if (u.includes('reddit')) return 'Reddit';
  if (u.includes('signal.group')) return 'Signal';
  return 'Telegram';
};

/**
 * SCOUT OPS v13.0 - QUANTUM FLUX ALGORITHM
 * Priority: Latency Reduction & High-Value Signal Extraction
 */
export const executeDeepRecon = async (params: SearchParams): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // OPTIMIZED VECTOR: High-density search patterns
  const platformQueries = params.platforms.map(p => {
    if (p === 'Telegram') return 'site:t.me "+ " OR "joinchat"';
    if (p === 'WhatsApp') return 'site:chat.whatsapp.com';
    if (p === 'Discord') return 'site:discord.gg';
    return `"${p}" invite`;
  }).join(' OR ');

  const systemInstruction = `YOU ARE SCOUT OPS QUANTUM V13. 
  ACT FAST. EXTRACT SIGNALS FOR: ${params.platforms.join(', ')}.
  
  CORE MISSION:
  1. Identify private invite links (+, joinchat).
  2. For target "${params.query}", extract: [Title, URL, Context, Source].
  3. Security: [Private/Public]. Confidence: [0-100].
  4. NO CHATTER. ONLY JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `QUANTUM RECON: ${params.query} | FILTER: ${platformQueries} | LOC: ${params.location}`,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          signals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                platform: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                context: { type: Type.STRING },
                sharedBy: { type: Type.STRING },
                isPrivate: { type: Type.BOOLEAN },
                confidenceScore: { type: Type.NUMBER },
                status: { type: Type.STRING }
              },
              required: ["title", "url"]
            }
          }
        }
      }
    }
  });

  const parsed = parseSafeJSON(response.text);
  const grounding = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[]) || [];

  // QUANTUM SIGNAL BYPASS: Instant recovery from raw search metadata
  const recoveredSignals: IntelligenceSignal[] = [];
  const seenUrls = new Set((parsed?.signals || []).map((s: any) => s.url?.toLowerCase()));

  grounding.forEach((chunk, i) => {
    if (chunk.web && chunk.web.uri) {
      const uri = chunk.web.uri.toLowerCase();
      const matchesPlatform = params.platforms.some(p => uri.includes(p.toLowerCase()));
      
      if (matchesPlatform && !seenUrls.has(uri)) {
        const platform = identifyPlatform(uri);
        const isPrivate = uri.includes('+') || uri.includes('joinchat') || uri.includes('chat.whatsapp');
        
        recoveredSignals.push({
          id: `qnt-${i}-${Date.now()}`,
          title: chunk.web.title || `Found: ${platform}`,
          url: chunk.web.uri,
          platform,
          type: isPrivate ? 'Private Group' : 'Public Group',
          description: "Recovered via Quantum Bypass Layer.",
          isPrivate,
          securityLevel: isPrivate ? 'High' : 'Low',
          confidenceScore: isPrivate ? 95 : 75,
          status: 'Active',
          timestamp: new Date().toLocaleTimeString(),
          location: params.location,
          sharedBy: "Global Matrix"
        });
        seenUrls.add(uri);
      }
    }
  });

  const finalSignals = [
    ...(parsed?.signals || []).map((s: any) => ({
      ...s,
      id: `ops-v13-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString(),
      platform: identifyPlatform(s.url),
      location: params.location,
      securityLevel: s.isPrivate ? 'High' : 'Low'
    })),
    ...recoveredSignals
  ];

  // Professional prioritization
  finalSignals.sort((a, b) => (b.isPrivate ? 1 : -1) - (a.isPrivate ? 1 : -1) || (b.confidenceScore - a.confidenceScore));

  return {
    analysis: parsed?.analysis || "Quantum scan complete. Signal density optimal.",
    signals: finalSignals,
    groundingSources: grounding.filter(c => c.web).map(c => ({ title: c.web.title, uri: c.web.uri })),
    summary: {
      totalDetected: finalSignals.length,
      privateSignals: finalSignals.filter(s => s.isPrivate).length,
      signalStrength: finalSignals.length > 0 
        ? Math.round(finalSignals.reduce((acc, s) => acc + (s.confidenceScore || 50), 0) / finalSignals.length) 
        : 0
    }
  };
};
