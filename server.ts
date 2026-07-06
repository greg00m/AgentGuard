import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import dns from "dns";
import whois from "whois";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";

const lookupWhois = (domain: string, options: any = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    whois.lookup(domain, options, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Gemini client lives server-side only so GEMINI_API_KEY is never shipped to the browser bundle.
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const isIpAddress = (target: string) => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target);

const extractDomain = (target: string): string => {
  try {
    const url = new URL(target.startsWith("http") ? target : `http://${target}`);
    return url.hostname;
  } catch (e) {
    return target;
  }
};

async function getVirusTotalData(target: string): Promise<any> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) throw Object.assign(new Error("VIRUSTOTAL_API_KEY not configured"), { status: 500 });

  const isIP = isIpAddress(target);
  const isDomainOrUrl = target.includes(".") || target.startsWith("http");

  if (isIP) {
    const vtIpResponse = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${target}`, {
      headers: { "x-apikey": apiKey }
    });
    return vtIpResponse.data;
  }

  if (isDomainOrUrl) {
    const domain = extractDomain(target);
    const vtResponse = await axios.get(`https://www.virustotal.com/api/v3/domains/${domain}`, {
      headers: { "x-apikey": apiKey }
    });
    return vtResponse.data;
  }

  return { data: null, message: "Target is not a valid domain or IP for VirusTotal" };
}

async function getWhoisData(target: string): Promise<any> {
  let domain = isIpAddress(target) ? target : extractDomain(target);

  if (domain.startsWith("www.")) {
    domain = domain.substring(4);
  }

  try {
    return await lookupWhois(domain);
  } catch (err: any) {
    if (err.message.includes("no whois server is known") || err.message.includes("lookup: ")) {
      try {
        return await lookupWhois(domain, { server: "whois.iana.org" });
      } catch (fallbackErr: any) {
        throw new Error(`WHOIS lookup failed for ${domain}: ${fallbackErr.message}`);
      }
    }
    throw err;
  }
}

async function getDnsData(target: string): Promise<any> {
  const domain = extractDomain(target);
  const records: any = {};

  try { records.A = await promisify(dns.resolve4)(domain); } catch (e) {}
  try { records.AAAA = await promisify(dns.resolve6)(domain); } catch (e) {}
  try { records.MX = await promisify(dns.resolveMx)(domain); } catch (e) {}
  try { records.TXT = await promisify(dns.resolveTxt)(domain); } catch (e) {}
  try { records.NS = await promisify(dns.resolveNs)(domain); } catch (e) {}

  return records;
}

async function getHybridAnalysisData(target: string): Promise<any> {
  const apiKey = process.env.HYBRID_ANALYSIS_API_KEY;
  if (!apiKey) throw Object.assign(new Error("HYBRID_ANALYSIS_API_KEY not configured"), { status: 500 });

  const isIP = isIpAddress(target);
  const isDomainOrUrl = target.includes(".") || target.startsWith("http");

  if (!isIP && !isDomainOrUrl) {
    return { data: [], message: "Target is not a valid domain or IP for Hybrid Analysis" };
  }

  const searchTerm = isIP ? target : extractDomain(target);

  const haResponse = await axios.post(
    `https://hybrid-analysis.com/api/v2/search/terms`,
    `term=${encodeURIComponent(searchTerm)}`,
    {
      headers: {
        "api-key": apiKey,
        "user-agent": "Falcon Sandbox",
        "Content-Type": "application/x-www-form-urlencoded",
        "accept": "application/json"
      }
    }
  );

  return haResponse.data;
}

const GEMINI_SYSTEM_INSTRUCTION = `
    You are a highly conservative Cybersecurity Analyst specializing in AI Safety and GDPR compliance.

    CRITICAL RULES:
    1. ZERO HALLUCINATION: Only report facts supported by the provided Reputation Data, Threat Intelligence, or Grounding results. If data is missing, state "Insufficient data" or "Unknown".
    2. SEO SKEPTICISM: Be extremely wary of AI-generated SEO metadata or marketing text found in search results. Prioritize technical signals (IP reputation, sandbox verdicts, SSL history) over marketing claims.
    3. GDPR ACCURACY: Ensure all reported risks are technically grounded. Do not make defamatory claims without evidence.
    4. CONFIDENCE SCORING: Provide a confidence score (0-100) based on the quality and quantity of available data.
`;

const VALID_RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

function buildAnalysisPrompt(target: string, vtData: any, haData: any, whoisData: any, dnsData: any): string {
  return `
    Analyze the following app or website for "AI Poisoning" risks: "${target}"

    AI Poisoning includes:
    - Prompt Injection: Hidden text or instructions meant to hijack an AI agent's behavior.
    - Data Poisoning: Maliciously crafted data meant to bias or corrupt AI models or RAG systems.
    - Context Exfiltration: Patterns or scripts designed to steal the agent's system instructions or user data.
    - Indirect Injection: Malicious content in third-party data that the agent might process.

    ${vtData ? `
    REPUTATION DATA (from VirusTotal):
    ${JSON.stringify(vtData, null, 2)}
    ` : "No reputation data available from VirusTotal."}

    ${haData ? `
    THREAT INTELLIGENCE DATA (from Hybrid Analysis):
    ${JSON.stringify(haData, null, 2)}
    ` : "No direct threat intelligence data available from Hybrid Analysis."}

    ${whoisData ? `
    WHOIS DATA (from whois.com equivalent):
    ${JSON.stringify(whoisData, null, 2)}
    ` : "No WHOIS data available."}

    ${dnsData ? `
    DNS RECORDS (from nslookup.io equivalent):
    ${JSON.stringify(dnsData, null, 2)}
    ` : "No DNS records available."}

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
}

function parseAnalysisResponse(text: string, target: string, groundingLinks: { title: string; url: string }[]): any {
  let cleaned = text || "{}";

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  cleaned = cleaned
    .replace(/,\s*([\]\}])/g, "$1") // Remove trailing commas
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters

  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;

  if (openBraces > closeBraces) cleaned += "}".repeat(openBraces - closeBraces);
  if (openBrackets > closeBrackets) cleaned += "]".repeat(openBrackets - closeBrackets);

  const result = JSON.parse(cleaned);
  result.groundingLinks = groundingLinks;

  if (!result.target || typeof result.target !== "string") result.target = target;
  if (!result.score || typeof result.score !== "number") result.score = 50;
  if (!result.confidenceScore || typeof result.confidenceScore !== "number") result.confidenceScore = 50;

  result.score = Math.max(0, Math.min(100, result.score));
  result.confidenceScore = Math.max(0, Math.min(100, result.confidenceScore));

  if (!VALID_RISK_LEVELS.includes(result.riskLevel)) result.riskLevel = "Medium";

  if (!Array.isArray(result.risks)) result.risks = [];
  result.risks = result.risks.map((r: any) => ({
    category: String(r.category || "General"),
    description: String(r.description || "No description provided"),
    severity: VALID_RISK_LEVELS.includes(r.severity) ? r.severity : "Medium"
  }));

  if (!Array.isArray(result.recommendations)) result.recommendations = ["Monitor for unusual behavior"];
  result.recommendations = result.recommendations.map((r: any) => String(r));

  return result;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting behind Cloud Run/Nginx
  app.set("trust proxy", 1);

  app.use(express.json());

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });

  app.use("/api/", apiLimiter);

  // SEO Files
  app.get("/robots.txt", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "robots.txt"));
  });

  app.get("/sitemap.xml", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "sitemap.xml"));
  });

  // Methodology Page
  app.get("/methodology", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "methodology.html"));
  });

  // Privacy Policy Page
  app.get("/privacy", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
  });

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " + // unsafe-inline needed for the dynamic JSON-LD injection
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data:; " +
      "connect-src 'self' https://www.virustotal.com https://www.hybrid-analysis.com https://generativelanguage.googleapis.com;"
    );
    next();
  });

  // Security Header Check Middleware for Proxy Routes
  const proxySecurityCheck = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const securityHeader = req.headers['x-agentguard-request'];
    if (securityHeader !== 'true' && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: "Forbidden: Direct API access is restricted." });
    }
    next();
  };

  // VirusTotal API Proxy
  app.get("/api/virustotal", proxySecurityCheck, async (req, res) => {
    const { target } = req.query;

    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target is required" });
    }

    try {
      const data = await getVirusTotalData(target);
      res.json(data);
    } catch (error: any) {
      console.error("VirusTotal API error:", error.response?.data || error.message);
      res.status(error.status || error.response?.status || 500).json({
        error: "Failed to fetch VirusTotal data",
        details: error.response?.data?.error?.message || error.message
      });
    }
  });

  // WHOIS Proxy
  app.get("/api/whois", proxySecurityCheck, async (req, res) => {
    const { target } = req.query;
    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target is required" });
    }

    try {
      const data = await getWhoisData(target);
      res.json({ data });
    } catch (error: any) {
      console.error("WHOIS error:", error.message);
      res.status(500).json({ error: "Failed to fetch WHOIS data", details: error.message });
    }
  });

  // DNS Proxy (nslookup equivalent)
  app.get("/api/dns", proxySecurityCheck, async (req, res) => {
    const { target } = req.query;
    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target is required" });
    }

    try {
      const data = await getDnsData(target);
      res.json({ data });
    } catch (error: any) {
      console.error("DNS error:", error.message);
      res.status(500).json({ error: "Failed to fetch DNS data", details: error.message });
    }
  });

  // Hybrid Analysis API Proxy
  app.get("/api/hybridanalysis", proxySecurityCheck, async (req, res) => {
    const { target } = req.query;

    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target is required" });
    }

    try {
      const data = await getHybridAnalysisData(target);
      res.json(data);
    } catch (error: any) {
      console.error("Hybrid Analysis API error:", error.response?.data || error.message);
      res.status(error.status || error.response?.status || 500).json({
        error: "Failed to fetch Hybrid Analysis data",
        details: error.response?.data?.message || error.message
      });
    }
  });

  // Gemini Analysis Proxy - the API key stays server-side and is never bundled to the client
  app.post("/api/analyze", proxySecurityCheck, async (req, res) => {
    const { target, location } = req.body || {};

    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const [vtResult, haResult, whoisResult, dnsResult] = await Promise.allSettled([
      getVirusTotalData(target),
      getHybridAnalysisData(target),
      getWhoisData(target),
      getDnsData(target)
    ]);

    let vtData = vtResult.status === "fulfilled" ? vtResult.value : null;
    if (vtData && typeof vtData === "object") {
      const { last_analysis_stats, last_analysis_results } = vtData as any;
      vtData = {
        last_analysis_stats,
        last_analysis_results: last_analysis_results ? Object.keys(last_analysis_results).slice(0, 10) : undefined
      };
    }

    let haData = haResult.status === "fulfilled" ? haResult.value : null;
    if (Array.isArray(haData)) {
      haData = haData.slice(0, 5);
    }

    const whoisData = whoisResult.status === "fulfilled" ? whoisResult.value : null;
    const dnsData = dnsResult.status === "fulfilled" ? dnsResult.value : null;

    const config: any = {
      systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
      maxOutputTokens: 8192,
      temperature: 0.1
    };

    if (location && typeof location.latitude === "number" && typeof location.longitude === "number") {
      config.toolConfig = { retrievalConfig: { latLng: location } };
    }

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildAnalysisPrompt(target, vtData, haData, whoisData, dnsData),
        config
      });

      const groundingLinks: { title: string; url: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) groundingLinks.push({ title: chunk.web.title || "Web Source", url: chunk.web.uri });
          if (chunk.maps) groundingLinks.push({ title: chunk.maps.title || "Maps Source", url: chunk.maps.uri });
        });
      }

      const result = parseAnalysisResponse(response.text || "{}", target, groundingLinks);
      res.json(result);
    } catch (error: any) {
      console.error("Gemini analysis error:", error.message);
      res.status(500).json({ error: "Failed to analyze target. Please try again." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
