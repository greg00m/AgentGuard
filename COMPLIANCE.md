# AgentGuard Compliance & Security Documentation

## 1. Store Submission Checklist
- [x] **Privacy Policy:** Accessible via footer and info button.
- [x] **Data Collection:** Explicitly states "No data collected" and "No data shared" for PII.
- [x] **Disclaimers:** Includes "Not a replacement for endpoint protection" and "AI-generated analysis" warnings.
- [x] **Scope:** Clarifies that the app does not scan devices or local network traffic.
- [x] **Auto-Trigger:** Documented confirmation step for shared links.
- [x] **Contact:** DPO contact email provided (privacy@agentguard.ai).

## 2. GDPR Article 13 Notice
**Data Controller:** AgentGuard Security Research
**Lawful Basis:** Legitimate Interest (Art. 6(1)(f)) for security threat identification and service protection.
**Data Processed:** 
- User-provided URLs/Text (Transiently processed, not stored).
- IP Address/User Agent (Purged every 24 hours).
**Recipients:** 
- Google Gemini API (Semantic analysis).
- VirusTotal (Reputation scanning).
- Hybrid Analysis (Sandbox analysis).
**Retention:** Scan data is not persisted. Logs are kept for 24 hours for rate limiting.
**Your Rights:** You have the right to access, rectify, or erase your data. Contact privacy@agentguard.ai.

## 3. Security Review Appendix
### Architecture
- **Frontend:** React SPA with client-side rate limiting.
- **Backend:** Express proxy with `express-rate-limit` and strict CSP headers.
- **AI Integration:** Google Gemini 3.1 Pro with `maxOutputTokens` guardrails and low temperature for deterministic output.

### Hardening Measures
- **Input Sanitization:** 500-char limit, control character stripping, URL normalization.
- **Output Sanitization:** Strict Markdown allowlist (blocking iframes, scripts, forms).
- **Network Security:** CSP blocks unauthorized connections and scripts.
- **Rate Limiting:** Multi-layered (Client + Server) to prevent API abuse.

### Disclaimer
AgentGuard is a heuristic tool for AI security research. It is not a substitute for professional security audits or endpoint protection software.
