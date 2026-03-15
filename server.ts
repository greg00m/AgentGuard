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

const lookupWhois = (domain: string, options: any = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    whois.lookup(domain, options, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};
const resolveAny = promisify(dns.resolveAny);
const lookupDns = promisify(dns.lookup);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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
      "img-src 'self' data: https://picsum.photos https://agentguard.ai; " +
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
    const apiKey = process.env.VIRUSTOTAL_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "VIRUSTOTAL_API_KEY not configured" });
    }

    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target is required" });
    }

    try {
      // Check if target is an IP address
      const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target);
      
      // Check if target looks like a domain or URL
      const isDomainOrUrl = target.includes('.') || target.startsWith('http');

      if (isIP) {
        const vtIpResponse = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${target}`, {
          headers: { 'x-apikey': apiKey }
        });
        return res.json(vtIpResponse.data);
      }

      if (isDomainOrUrl) {
        // Try to extract domain from URL or use as is
        let domain = target;
        try {
          const url = new URL(target.startsWith('http') ? target : `http://${target}`);
          domain = url.hostname;
        } catch (e) {
          // Fallback to target as is if it's just a domain string
        }

        const vtResponse = await axios.get(`https://www.virustotal.com/api/v3/domains/${domain}`, {
          headers: { 'x-apikey': apiKey }
        });

        return res.json(vtResponse.data);
      }

      // If not IP or Domain, return empty or skip
      res.json({ data: null, message: "Target is not a valid domain or IP for VirusTotal" });
    } catch (error: any) {
      console.error("VirusTotal API error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
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
      // Extract domain or use IP
      let domain = target;
      const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target);
      
      if (!isIP) {
        try {
          const url = new URL(target.startsWith('http') ? target : `http://${target}`);
          domain = url.hostname;
        } catch (e) {}
      }

      // Ensure we have a clean domain (remove www. if present for better whois compatibility)
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }

      let data;
      try {
        data = await lookupWhois(domain);
      } catch (err: any) {
        if (err.message.includes('no whois server is known') || err.message.includes('lookup: ')) {
          // Try fallback to IANA if default lookup fails to find a server
          try {
            data = await lookupWhois(domain, { server: 'whois.iana.org' });
          } catch (fallbackErr: any) {
            throw new Error(`WHOIS lookup failed for ${domain}: ${fallbackErr.message}`);
          }
        } else {
          throw err;
        }
      }
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
      let domain = target;
      try {
        const url = new URL(target.startsWith('http') ? target : `http://${target}`);
        domain = url.hostname;
      } catch (e) {}

      const records: any = {};
      
      try { records.A = await promisify(dns.resolve4)(domain); } catch (e) {}
      try { records.AAAA = await promisify(dns.resolve6)(domain); } catch (e) {}
      try { records.MX = await promisify(dns.resolveMx)(domain); } catch (e) {}
      try { records.TXT = await promisify(dns.resolveTxt)(domain); } catch (e) {}
      try { records.NS = await promisify(dns.resolveNs)(domain); } catch (e) {}

      res.json({ data: records });
    } catch (error: any) {
      console.error("DNS error:", error.message);
      res.status(500).json({ error: "Failed to fetch DNS data", details: error.message });
    }
  });

  // Hybrid Analysis API Proxy
  app.get("/api/hybridanalysis", proxySecurityCheck, async (req, res) => {
    const { target } = req.query;
    const apiKey = process.env.HYBRID_ANALYSIS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "HYBRID_ANALYSIS_API_KEY not configured" });
    }

    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target is required" });
    }

    try {
      // Only call HA if it looks like a domain or IP
      const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target);
      const isDomainOrUrl = target.includes('.') || target.startsWith('http');

      if (!isIP && !isDomainOrUrl) {
        return res.json({ data: [], message: "Target is not a valid domain or IP for Hybrid Analysis" });
      }

      // Extract domain/IP for better search results
      let searchTerm = target;
      if (!isIP) {
        try {
          const url = new URL(target.startsWith('http') ? target : `http://${target}`);
          searchTerm = url.hostname;
        } catch (e) {}
      }

      // Hybrid Analysis search for domain/IP
      // Using the correct endpoint (no www) and headers as per HA v2 documentation
      const haResponse = await axios.post(`https://hybrid-analysis.com/api/v2/search/terms`, 
        `term=${encodeURIComponent(searchTerm)}`, 
        {
          headers: { 
            'api-key': apiKey,
            'user-agent': 'Falcon Sandbox',
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json'
          }
        }
      );

      res.json(haResponse.data);
    } catch (error: any) {
      console.error("Hybrid Analysis API error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: "Failed to fetch Hybrid Analysis data",
        details: error.response?.data?.message || error.message
      });
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
