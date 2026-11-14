import { GoogleGenAI, Type } from "@google/genai";
import { TmiResponse, Attack } from '../types';

const apiKey = import.meta.env.VITE_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const unavailableMessage = "TMI uplink unavailable: configure VITE_API_KEY to enable Gemini intelligence.";

const tmiSchema = {
  type: Type.OBJECT,
  properties: {
    tmiStatus: { type: Type.STRING, description: "A professional tactical alert summary." },
    detectionScore: { type: Type.NUMBER, description: "Probability (0-100) of detection." },
    impactScore: { type: Type.NUMBER, description: "Potential business impact (0-100)." },
    remediationSuggestion: { type: Type.STRING, description: "Blue, Purple, White, and Red Hat remediation." }
  },
  required: ["tmiStatus", "detectionScore", "impactScore", "remediationSuggestion"]
};

const handleGeminiError = (error: any, context: string): string => {
  console.error(`${context} Failure:`, error);
  if (error.message?.includes("fetch")) return "Network Uplink Desynchronized: Check your connection to the tactical net.";
  if (error.status === 429 || error.message?.includes("429")) return "TMI Sensor Saturated: Rate limit reached.";
  if (error.message?.includes("API_KEY") || error.status === 401) return "Authentication Fault: Tactical API key is invalid or expired.";
  if (error.message?.includes("safety") || error.message?.includes("blocked")) return "Policy Violation: The directive was suppressed.";
  if (error.status >= 500) return "Core System Failure: Remote intelligence node returned a 5xx error.";
  return error.message || `${context} desynchronized. Directive failed.`;
};

const systemInstruction = `You are the Aegis Threat Metric Intelligence (TMI) Expert. Interpret raw network telemetry and provide Purple Team synthesis. Return JSON matching the supplied schema. Address Blue, Purple, White, and Red Hat perspectives.`;

export const analyzeCommand = async (commandWithOutput: string, scenarioName: string, history: Attack[] = []): Promise<TmiResponse> => {
  if (!ai) throw new Error(unavailableMessage);
  try {
    const historyContext = history.slice(0, 10).map(a => `- ${a.command} [TMI: ${a.tmiStatus}, Impact: ${a.impactScore}]`).join('\n');
    const prompt = `[AEGIS TACTICAL UPLINK]\nCURRENT SECTOR: ${scenarioName}\nOPERATIONAL HISTORY:\n${historyContext || "Initial contact. Zero history."}\n\n[INTERCEPTED TELEMETRY]\n${commandWithOutput}\n\nPerform a deep-dive defensive analysis and provide a Purple Team remediation strategy.`;
    const response = await ai.models.generateContent({ model: "gemini-3-pro-preview", contents: [{ parts: [{ text: prompt }] }], config: { systemInstruction, responseMimeType: "application/json", responseSchema: tmiSchema, tools: [{ googleSearch: {} }], thinkingConfig: { thinkingBudget: 24000 } } });
    if (!response.text) throw new Error("TMI Sensor Error: Null frame returned.");
    const tmi = JSON.parse(response.text) as TmiResponse;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && Array.isArray(groundingChunks)) tmi.sources = groundingChunks.filter(chunk => chunk.web).map(chunk => ({ uri: chunk.web.uri, title: chunk.web.title }));
    return tmi;
  } catch (error: any) { throw new Error(handleGeminiError(error, "TMI Link")); }
};

export const fetchIntelligence = async (query: string): Promise<string> => {
  if (!ai) return `[!] OSINT FAULT: ${unavailableMessage}`;
  try {
    const response = await ai.models.generateContent({ model: "gemini-3-pro-preview", contents: [{ parts: [{ text: `Analyze this cybersecurity intelligence query: ${query}. Summarize tools and techniques as a professional brief.` }] }], config: { systemInstruction: "You are the Aegis OSINT Specialist.", tools: [{ googleSearch: {} }], thinkingConfig: { thinkingBudget: 8000 } } });
    return response.text || "Intelligence buffer returned zero data.";
  } catch (error: any) { return `[!] OSINT FAULT: ${handleGeminiError(error, "Intel Node")}`; }
};

export const chatWithGemini = async (prompt: string): Promise<string> => {
  if (!ai) return `[!] COMMS FAULT: ${unavailableMessage}`;
  try {
    const response = await ai.models.generateContent({ model: "gemini-3-pro-preview", contents: [{ parts: [{ text: prompt }] }], config: { systemInstruction: "You are the Aegis Tactical AI Assistant.", tools: [{ googleSearch: {} }], thinkingConfig: { thinkingBudget: 4000 } } });
    return response.text || "Uplink silent. No signal returned.";
  } catch (error: any) { return `[!] COMMS FAULT: ${handleGeminiError(error, "AI Hub")}`; }
};
