import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Determine API base URL for native environments
const getApiUrl = (path: string) => {
  const isNative = window.location.protocol === 'capacitor:' || 
                   window.location.protocol === 'file:' || 
                   window.location.hostname === 'localhost' && !window.location.port; // Simple heuristic
  
  // In a real app, you'd use a VITE_API_URL env var
  // For this environment, we'll use the current origin if it's web, 
  // or a placeholder if it's native (user would need to configure this)
  const baseUrl = (isNative || window.location.origin === 'null') 
    ? 'https://ais-dev-esep3z2wvq3veuxzkffmes-218531837450.us-west2.run.app' 
    : '';
    
  return `${baseUrl}${path}`;
};

export interface AnalysisResult {
  target: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  score: number; // 0-100, where 100 is safest
  summary: string;
  risks: {
    category: string;
    description: string;
    severity: "Low" | "Medium" | "High";
  }[];
  recommendations: string[];
  detailedAnalysis: string;
  confidenceScore: number; // 0-100
  groundingLinks?: { title: string; url: string }[];
}

export async function analyzeTarget(target: string, location?: { latitude: number; longitude: number }): Promise<AnalysisResult> {
  const model = "gemini-2.5-flash";
  
  const systemInstruction = `
    You are a highly conservative Cybersecurity Analyst specializing in AI Safety and GDPR compliance.
    
    CRITICAL RULES:
    1. ZERO HALLUCINATION: Only report facts supported by the provided Reputation Data, Threat Intelligence, or Grounding results. If data is missing, state "Insufficient data" or "Unknown".
    2. SEO SKEPTICISM: Be extremely wary of AI-generated SEO metadata or marketing text found in search results. Prioritize technical signals (IP reputation, sandbox verdicts, SSL history) over marketing claims.
    3. GDPR ACCURACY: Ensure all reported risks are technically grounded. Do not make defamatory claims without evidence.
    4. CONFIDENCE SCORING: Provide a confidence score (0-100) based on the quality and quantity of available data.
  `;

  // Fetch VirusTotal data via proxy
  let vtData = null;
  try {
    const vtResponse = await fetch(getApiUrl(`/api/virustotal?target=${encodeURIComponent(target)}`), {
      headers: { 'X-AgentGuard-Request': 'true' }
    });
    if (vtResponse.ok) {
      vtData = await vtResponse.json();
      // Limit data size to prevent token overflow
      if (vtData && typeof vtData === 'object') {
        // Keep only essential fields if it's too large
        const { last_analysis_stats, last_analysis_results, ...rest } = vtData as any;
        vtData = { last_analysis_stats, last_analysis_results: last_analysis_results ? Object.keys(last_analysis_results).slice(0, 10) : undefined };
      }
    }
  } catch (err) {
    console.error("VirusTotal fetch failed:", err);
  }

  // Fetch Hybrid Analysis data via proxy
  let haData = null;
  try {
    const haResponse = await fetch(getApiUrl(`/api/hybridanalysis?target=${encodeURIComponent(target)}`), {
      headers: { 'X-AgentGuard-Request': 'true' }
    });
    if (haResponse.ok) {
      haData = await haResponse.json();
      // Limit data size
      if (Array.isArray(haData)) {
        haData = haData.slice(0, 5);
      }
    }
  } catch (err) {
    console.error("Hybrid Analysis fetch failed:", err);
  }

  // Fetch WHOIS data via proxy
  let whoisData = null;
  try {
    const whoisResponse = await fetch(getApiUrl(`/api/whois?target=${encodeURIComponent(target)}`), {
      headers: { 'X-AgentGuard-Request': 'true' }
    });
    if (whoisResponse.ok) {
      whoisData = await whoisResponse.json();
    }
  } catch (err) {
    console.error("WHOIS fetch failed:", err);
  }

  // Fetch DNS data via proxy
  let dnsData = null;
  try {
    const dnsResponse = await fetch(getApiUrl(`/api/dns?target=${encodeURIComponent(target)}`), {
      headers: { 'X-AgentGuard-Request': 'true' }
    });
    if (dnsResponse.ok) {
      dnsData = await dnsResponse.json();
    }
  } catch (err) {
    console.error("DNS fetch failed:", err);
  }

  const prompt = `
    Analyze the following app or website for "AI Poisoning" risks: "${target}"
    
    AI Poisoning includes:
    - Prompt Injection: Hidden text or instructions meant to hijack an AI agent's behavior.
    - Data Poisoning: Maliciously crafted data meant to bias or corrupt AI models or RAG systems.
    - Context Exfiltration: Patterns or scripts designed to steal the agent's system instructions or user data.
    - Indirect Injection: Malicious content in third-party data that the agent might process.
    
    ${vtData ? `
    REPUTATION DATA (from VirusTotal):
    ${JSON.stringify(vtData, null, 2)}
    ` : 'No reputation data available from VirusTotal.'}

    ${haData ? `
    THREAT INTELLIGENCE DATA (from Hybrid Analysis):
    ${JSON.stringify(haData, null, 2)}
    ` : 'No direct threat intelligence data available from Hybrid Analysis.'}

    ${whoisData ? `
    WHOIS DATA (from whois.com equivalent):
    ${JSON.stringify(whoisData, null, 2)}
    ` : 'No WHOIS data available.'}

    ${dnsData ? `
    DNS RECORDS (from nslookup.io equivalent):
    ${JSON.stringify(dnsData, null, 2)}
    ` : 'No DNS records available.'}

    Use the WHOIS data to check for domain age, registrar reputation, and ownership details.
    Use the DNS records to check for suspicious MX/TXT records or unusual infrastructure.
    
    Use Google Search and Google Maps to find information about this target's security reputation, known vulnerabilities, physical hosting location, and any reports of AI-related exploits.
    
    Provide a structured analysis. Ensure the response contains a JSON object with the following structure:
    {
      "target": "...",
      "riskLevel": "Low|Medium|High|Critical",
      "score": 0-100,
      "confidenceScore": 0-100,
      "summary": "...",
      "risks": [{"category": "...", "description": "...", "severity": "Low|Medium|High"}],
      "recommendations": ["..."],
      "detailedAnalysis": "Markdown report..."
    }
    IMPORTANT: Return ONLY the JSON object. Do not include any other text or markdown formatting outside the JSON. Ensure the JSON is valid and all strings are properly escaped.
  `;

  const config: any = {
    systemInstruction,
    tools: [{ googleSearch: {} }, { googleMaps: {} }],
    maxOutputTokens: 8192,
    temperature: 0.1,
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: location
      }
    };
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: config
  });

  try {
    let text = response.text || "{}";
    
    // Robust JSON extraction
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    // Basic cleaning for common LLM JSON errors (trailing commas)
    let cleanedText = text
      .replace(/,\s*([\]\}])/g, '$1') // Remove trailing commas
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters

    // Attempt to repair truncated JSON
    const openBraces = (cleanedText.match(/\{/g) || []).length;
    const closeBraces = (cleanedText.match(/\}/g) || []).length;
    const openBrackets = (cleanedText.match(/\[/g) || []).length;
    const closeBrackets = (cleanedText.match(/\]/g) || []).length;

    if (openBraces > closeBraces) {
      cleanedText += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      cleanedText += ']'.repeat(openBrackets - closeBrackets);
    }

    const result = JSON.parse(cleanedText);
    
    // Extract grounding links
    const groundingLinks: { title: string; url: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          groundingLinks.push({ title: chunk.web.title || 'Web Source', url: chunk.web.uri });
        }
        if (chunk.maps) {
          groundingLinks.push({ title: chunk.maps.title || 'Maps Source', url: chunk.maps.uri });
        }
      });
    }
    result.groundingLinks = groundingLinks;
    
    // Normalization and Validation
    if (!result.target || typeof result.target !== 'string') result.target = target;
    if (!result.score || typeof result.score !== 'number') result.score = 50;
    if (!result.confidenceScore || typeof result.confidenceScore !== 'number') result.confidenceScore = 50;
    
    result.score = Math.max(0, Math.min(100, result.score));
    result.confidenceScore = Math.max(0, Math.min(100, result.confidenceScore));
    
    const validLevels = ["Low", "Medium", "High", "Critical"];
    if (!validLevels.includes(result.riskLevel)) result.riskLevel = "Medium";
    
    if (!Array.isArray(result.risks)) result.risks = [];
    result.risks = result.risks.map((r: any) => ({
      category: String(r.category || "General"),
      description: String(r.description || "No description provided"),
      severity: validLevels.includes(r.severity) ? r.severity : "Medium"
    }));

    if (!Array.isArray(result.recommendations)) result.recommendations = ["Monitor for unusual behavior"];
    result.recommendations = result.recommendations.map((r: any) => String(r));

    return result as AnalysisResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to analyze target. Please try again.");
  }
}
