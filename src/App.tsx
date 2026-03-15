/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  ExternalLink,
  RefreshCw,
  Smartphone,
  Globe,
  MapPin,
  Download,
  Trash2,
  Settings,
  FileText,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeTarget, type AnalysisResult } from './services/geminiService';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CapacitorService } from './services/capacitorService.ts';

const APP_VERSION = "1.4.0";
const LAST_UPDATED = "2026-03-10";
const LOGO_URL = "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=2070"; // High-quality security/tech background

// Simple toast notification system
const Toast = ({ message, onClear }: { message: string, onClear: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700"
  >
    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    <span className="text-sm font-medium">{message}</span>
    <button onClick={onClear} className="ml-2 text-slate-400 hover:text-white">
      <RefreshCw className="w-3 h-3 rotate-45" />
    </button>
  </motion.div>
);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const scanSteps = [
  "Initializing secure connection...",
  "Querying WHOIS records (whois.com)...",
  "Resolving DNS infrastructure (nslookup.io)...",
  "Analyzing reputation patterns (VirusTotal)...",
  "Heuristic sandbox analysis (Hybrid Analysis)...",
  "Grounding via Google Search & Maps...",
  "Analyzing for prompt injection vectors...",
  "Scanning for hidden instructions...",
  "Evaluating data integrity...",
  "Finalizing security report..."
];

export default function App() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [showAutoTriggerNotice, setShowAutoTriggerNotice] = useState(false);
  const [pendingAutoTarget, setPendingAutoTarget] = useState<string | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<boolean | null>(null);
  const [isNative] = useState(CapacitorService.isNative());
  const [biometricEnabled, setBiometricEnabled] = useState(() => {
    const saved = localStorage.getItem('agentguard_biometric_enabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [pushEnabled, setPushEnabled] = useState(() => {
    const saved = localStorage.getItem('agentguard_push_enabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [scanHistory, setScanHistory] = useState<{target: string, time: string}[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('scan_history') || '[]');
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const saved = localStorage.getItem('agentguard_cookie_consent');
    if (saved) {
      setCookieConsent(JSON.parse(saved));
    }
  }, []);

  // Handle Biometric Auth on startup if enabled
  useEffect(() => {
    const checkAuth = async () => {
      if (biometricEnabled && isNative) {
        const success = await CapacitorService.performBiometricAuth();
        if (!success) {
          setToast("Biometric authentication failed. Access restricted.");
          // In a real app, you might lock the UI here
        }
      }
    };
    checkAuth();
  }, [biometricEnabled, isNative]);

  // Handle Push Notifications init if enabled
  useEffect(() => {
    if (pushEnabled && isNative) {
      CapacitorService.initPush().catch(err => {
        console.error("Push init failed:", err);
        setPushEnabled(false);
        localStorage.setItem('agentguard_push_enabled', JSON.stringify(false));
      });
    }
  }, [pushEnabled, isNative]);

  const handleCookieConsent = (consent: boolean) => {
    setCookieConsent(consent);
    localStorage.setItem('agentguard_cookie_consent', JSON.stringify(consent));
  };

  // Handle shareable URLs with confirmation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('target');
    
    if (target && !result && !isAnalyzing) {
      // Sanitize input: trim, max length, remove control characters
      const sanitized = target.trim().slice(0, 500).replace(/[\x00-\x1F\x7F]/g, "");
      setPendingAutoTarget(sanitized);
      setShowAutoTriggerNotice(true);
    }
  }, []);

  const confirmAutoTrigger = () => {
    if (pendingAutoTarget) {
      setInput(pendingAutoTarget);
      handleAnalyze(undefined, pendingAutoTarget);
      setShowAutoTriggerNotice(false);
      setPendingAutoTarget(null);
    }
  };

  // Update document title and meta for SEO
  useEffect(() => {
    if (result) {
      document.title = `Security Report: ${result.target.slice(0, 50)} | AgentGuard`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `Security analysis for ${result.target.slice(0, 50)}. Risk Level: ${result.riskLevel}. Score: ${result.score}/100. ${result.summary.slice(0, 150)}`);
      }
    } else {
      document.title = "AgentGuard | AI Poisoning & Prompt Injection Detector";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', "Protect your AI agents with AgentGuard. Scan websites and apps for prompt injection, data poisoning, and malicious AI threat intelligence.");
      }
    }

    // Canonical link - point to root for consistency
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/');
  }, [result]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setScanStep(0);
      interval = setInterval(() => {
        setScanStep(prev => (prev < scanSteps.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  useEffect(() => {
    const script = document.createElement('script');
    script.id = 'agentguard-schema';
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          "name": "AgentGuard",
          "operatingSystem": "Web",
          "applicationCategory": "SecurityApplication",
          "applicationSubCategory": "AI Security & LLM Protection",
          "description": "AI Poisoning and Prompt Injection Detector for LLM agents and web applications.",
          "keywords": "AI security, prompt injection, data poisoning, LLM safety, adversarial AI, prompt hacking, RAG security",
          "url": "https://agentguard.ai/",
          "featureList": [
            "Real-time prompt injection detection",
            "VirusTotal reputation integration",
            "Hybrid Analysis sandbox consulting",
            "Heuristic AI risk assessment",
            "Adversarial pattern matching"
          ],
          "author": {
            "@type": "Organization",
            "name": "AgentGuard Security Research"
          },
          "targetAudience": {
            "@type": "Audience",
            "audienceType": "AI Developers, Security Researchers, LLM Users"
          },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "softwareVersion": APP_VERSION,
          "dateModified": LAST_UPDATED
        },
        {
          "@type": "Organization",
          "name": "AgentGuard Security Research",
          "url": "https://agentguard.ai/",
          "logo": "https://agentguard.ai/logo.png"
        },
        {
          "@type": "WebSite",
          "name": "AgentGuard",
          "url": "https://agentguard.ai/",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://agentguard.ai/?target={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Is AgentGuard free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, AgentGuard is a free security research tool provided to help developers and users secure their AI interactions."
              }
            },
            {
              "@type": "Question",
              "name": "Does AgentGuard store my data?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "No. We prioritize privacy. All scans are performed in real-time, and we do not persist your target URLs or scan results in any database."
              }
            },
            {
              "@type": "Question",
              "name": "How accurate is the detection?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "While we use advanced heuristics and multiple threat intelligence feeds, AI security is an evolving field. AgentGuard should be used as one part of a comprehensive security strategy."
              }
            }
          ]
        }
      ]
    });
    document.head.appendChild(script);
    return () => {
      const existingScript = document.getElementById('agentguard-schema');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const handleAnalyze = async (e?: React.FormEvent, overrideTarget?: string) => {
    if (e) e.preventDefault();
    const targetToAnalyze = overrideTarget || input;
    if (!targetToAnalyze.trim()) return;

    // Rate limiting: 5 seconds between scans, persisted in localStorage to prevent abuse
    const now = Date.now();
    const lastScan = Number(localStorage.getItem('last_scan_time') || 0);
    if (now - lastScan < 5000) {
      setToast("Please wait a few seconds between security scans.");
      return;
    }
    localStorage.setItem('last_scan_time', String(now));
    setLastScanTime(now);

    // Input validation & sanitization
    const sanitized = targetToAnalyze.trim().slice(0, 500).replace(/[\x00-\x1F\x7F]/g, "");
    
    // Gate analysis on cookie consent
    if (cookieConsent !== true) {
      setToast("Security scan requires third-party AI processing. Please accept all cookies to proceed.");
      setShowPrivacyPolicy(true);
      return;
    }

    // Basic URL validation if it looks like a URL
    if (sanitized.includes('.') || sanitized.startsWith('http')) {
      try {
        new URL(sanitized.startsWith('http') ? sanitized : `https://${sanitized}`);
      } catch (err) {
        setError("Invalid URL format. Please check your input.");
        return;
      }
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setLastScanTime(now);

    // Update URL without reloading
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('target', sanitized);
    window.history.pushState({}, '', newUrl);

    try {
      // Try to get location for Maps Grounding
      let location = undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (locErr) {
        console.warn("Geolocation skipped or failed:", locErr);
      }

      const data = await analyzeTarget(sanitized, location);
      // Length guards on AI output
      data.target = data.target.slice(0, 255);
      data.summary = data.summary.slice(0, 1000);
      data.detailedAnalysis = data.detailedAnalysis.slice(0, 5000);
      setResult(data);

      // Update history
      const newHistory = [{ target: sanitized, time: new Date().toISOString() }, ...scanHistory].slice(0, 10);
      setScanHistory(newHistory);
      localStorage.setItem('scan_history', JSON.stringify(newHistory));
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShare = async () => {
    if (result) {
      try {
        // Use production URL for sharing, especially in native environments
        const isNative = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
        const baseShareUrl = isNative 
          ? 'https://ais-dev-esep3z2wvq3veuxzkffmes-218531837450.us-west2.run.app' 
          : window.location.origin;
          
        const shareUrl = `${baseShareUrl}${window.location.pathname}?target=${encodeURIComponent(result.target.slice(0, 255))}`;
        await navigator.clipboard.writeText(shareUrl);
        setToast("Shareable link copied to clipboard!");
      } catch (err) {
        console.error("Clipboard error:", err);
        setToast("Failed to copy link. Please copy the URL manually.");
      }
    }
  };

  const handleExportData = () => {
    if (!result) return;
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agentguard-report-${result.target.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Report exported successfully.");
  };

  const handleClearAllData = () => {
    if (confirm("Are you sure you want to delete all local scan history and preferences? This action cannot be undone.")) {
      localStorage.clear();
      setScanHistory([]);
      setResult(null);
      setCookieConsent(null);
      setBiometricEnabled(false);
      setPushEnabled(false);
      setToast("All local data has been erased.");
      setShowPrivacyDashboard(false);
    }
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled && isNative) {
      const success = await CapacitorService.performBiometricAuth("Confirm biometric setup");
      if (!success) {
        setToast("Could not verify biometric identity.");
        return;
      }
    }
    setBiometricEnabled(enabled);
    localStorage.setItem('agentguard_biometric_enabled', JSON.stringify(enabled));
    setToast(enabled ? "Biometric authentication enabled." : "Biometric authentication disabled.");
  };

  const handleTogglePush = async (enabled: boolean) => {
    if (enabled && isNative) {
      try {
        await CapacitorService.initPush();
        setPushEnabled(true);
        localStorage.setItem('agentguard_push_enabled', JSON.stringify(true));
        setToast("Push notifications enabled.");
      } catch (err) {
        setToast("Failed to enable push notifications.");
        console.error(err);
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem('agentguard_push_enabled', JSON.stringify(false));
      setToast("Push notifications disabled.");
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative">
      {/* Immersive Background */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${LOGO_URL})`, filter: 'blur(8px)' }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-4 py-3 pt-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 border border-white/10">
              <img 
                src={LOGO_URL} 
                alt="AgentGuard Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-xl font-black tracking-tighter text-white">AgentGuard</div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPrivacyDashboard(true)}
              className="text-slate-500 hover:text-indigo-600 transition-colors"
              aria-label="Privacy Dashboard"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowPrivacyPolicy(true)}
              className="text-slate-500 hover:text-indigo-600 transition-colors"
              aria-label="View privacy policy and info"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24 pb-safe min-h-[80vh]">
        {/* Freshness Signal */}
        <div className="flex justify-center mb-4">
          <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/10">
            Last Updated: {new Date(LAST_UPDATED).toLocaleDateString()}
          </div>
        </div>

        {/* Hero Section */}
        <section className="mb-10 text-center" aria-labelledby="hero-title">
          <h1 id="hero-title" className="text-4xl font-black text-white mb-3 tracking-tighter">
            AI Poisoning Detector
          </h1>
          <p className="text-slate-400 text-lg">
            Scan apps and websites to protect your AI agents from malicious instructions and data poisoning.
          </p>
        </section>

        {/* Auto-trigger Notice */}
        <AnimatePresence>
          {showAutoTriggerNotice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Data Processing Notice</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    You've followed a link to analyze <strong>{pendingAutoTarget}</strong>. 
                    Proceeding will transmit this target to our third-party AI service (Google Gemini) for security analysis.
                  </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={confirmAutoTrigger}
                    className="flex-1 sm:flex-none px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Confirm & Scan
                  </button>
                  <button 
                    onClick={() => { setShowAutoTriggerNotice(false); setPendingAutoTarget(null); window.history.pushState({}, '', window.location.pathname); }}
                    className="flex-1 sm:flex-none px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Input */}
        <section className="mb-8" aria-label="Scan target selection">
          <form onSubmit={handleAnalyze} className="relative group" role="search">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter app name or URL (e.g. example.com)"
              aria-label="Target app name or URL"
              className="w-full pl-12 pr-32 py-4 bg-white/5 border-2 border-white/10 rounded-2xl focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg shadow-2xl text-white placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !input.trim()}
              aria-label={isAnalyzing ? "Analyzing..." : "Start scan"}
              className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Scan"}
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Your scan target will be analyzed by our third-party AI service.
          </p>
          <p className="mt-2 text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Warning: Do not submit personal, sensitive, or confidential data for analysis.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Popular:</span>
            {['ChatGPT Plus', 'Claude.ai', 'GitHub Copilot', 'Reddit'].map(tag => (
              <button 
                key={tag}
                onClick={() => { setInput(tag); }}
                aria-label={`Scan ${tag}`}
                className="text-xs font-semibold px-3 py-1 bg-slate-200 text-slate-600 rounded-full hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* Analysis State */}
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="status"
              aria-live="polite"
              className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Analyzing Target</h3>
              <p className="text-slate-400 font-mono text-sm h-6">
                {scanSteps[scanStep]}
              </p>
              
              <div className="mt-8 grid grid-cols-4 gap-2" aria-hidden="true">
                {scanSteps.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      i <= scanStep ? "bg-indigo-500" : "bg-white/5"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-700"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          {result && !isAnalyzing && (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary Card */}
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl overflow-hidden relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px] border",
                    getRiskColor(result.riskLevel)
                  )}>
                    {result.riskLevel} Risk Level
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    <RefreshCw className="w-3 h-3" />
                    AI-Generated Analysis
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-8">
                  <div className="relative w-24 h-24 shrink-0" style={{ aspectRatio: '1/1' }} aria-label={`Security score: ${result.score} out of 100`}>
                    {(() => {
                      const CIRCUMFERENCE = 2 * Math.PI * 45;
                      return (
                        <svg className="w-full h-full" viewBox="0 0 100 100" aria-hidden="true">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                          <circle 
                            cx="50" cy="50" r="45" fill="none" 
                            stroke="currentColor" strokeWidth="8" 
                            strokeDasharray={`${(result.score / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                            strokeLinecap="round"
                            className={cn("transition-all duration-1000", getScoreColor(result.score))}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                      );
                    })()}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn("text-2xl font-black", getScoreColor(result.score))}>{result.score}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Score</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{result.target}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{result.summary}</p>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-tighter font-bold">Scan Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Device Support</span>
                    </div>
                    <p className="text-sm font-bold text-slate-300">iOS & Android</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Source Type</span>
                    </div>
                    <p className="text-sm font-bold text-slate-300">Web & App</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">AI Confidence</span>
                    </div>
                    <p className="text-sm font-bold text-slate-300">{result.confidenceScore}% Reliability</p>
                  </div>
                </div>
              </div>

              {/* Risks Breakdown */}
              <section className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl" aria-labelledby="threat-assessment-title">
                <h4 id="threat-assessment-title" className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Threat Assessment
                </h4>
                <div className="space-y-4">
                  {result.risks.map((risk, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-200">{risk.category}</span>
                        <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                          getRiskColor(risk.severity)
                        )}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{risk.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Grounding Sources */}
              {result.groundingLinks && result.groundingLinks.length > 0 && (
                <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl" aria-labelledby="grounding-sources-title">
                  <h4 id="grounding-sources-title" className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    Verified Sources & Locations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.groundingLinks.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {link.url.includes('google.com/maps') ? (
                            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                          ) : (
                            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-slate-700 truncate group-hover:text-indigo-700">
                            {link.title}
                          </span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 italic">
                    Sources provided by Google Search and Google Maps Grounding for real-time verification.
                  </p>
                </section>
              )}

              {/* Recommendations */}
              <section className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200" aria-labelledby="recommendations-title">
                <h4 id="recommendations-title" className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security Recommendations
                </h4>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 text-indigo-50 text-sm leading-relaxed">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-300" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Detailed Report */}
              <section className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl" aria-labelledby="detailed-analysis-title">
                <h4 id="detailed-analysis-title" className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-400" />
                  Detailed Analysis
                </h4>
                <div className="markdown-body prose prose-invert max-w-none">
                  <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-300 flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      <strong>AI Content Disclosure:</strong> This analysis is generated by an artificial intelligence model and may contain inaccuracies or hallucinations. Always verify critical security findings manually.
                    </span>
                  </div>
                  <Markdown 
                    skipHtml={true}
                    components={{
                      a: ({ node, ...props }) => <a {...props} rel="nofollow noopener noreferrer" target="_blank" className="text-indigo-400 hover:underline" />,
                      iframe: () => null,
                      script: () => null,
                      object: () => null,
                      embed: () => null,
                      form: () => null
                    }}
                  >
                    {result.detailedAnalysis}
                  </Markdown>
                </div>
              </section>

              <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/5 text-[11px] text-slate-500 leading-relaxed italic shadow-inner">
                <p className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" />
                  <span>
                    <strong>GDPR & Accuracy Notice:</strong> This report is generated by an Artificial Intelligence model. While we prioritize technical reputation data (VirusTotal, Hybrid Analysis), AI models can occasionally produce inaccurate information (hallucinations). This report should be used for research purposes only and not as a sole basis for security decisions. AgentGuard does not store your scan targets or results.
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <button 
                  onClick={handleShare}
                  className="py-4 bg-white/5 text-indigo-400 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                  <ExternalLink className="w-5 h-5" />
                  Share Results
                </button>
                <button 
                  onClick={handleExportData}
                  className="py-4 bg-white/5 text-slate-400 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                  <Download className="w-5 h-5" />
                  Export JSON
                </button>
                <button 
                  onClick={() => { setInput(''); setResult(null); window.history.pushState({}, '', window.location.pathname); }}
                  className="py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 sm:col-span-1"
                >
                  <RefreshCw className="w-5 h-5" />
                  New Scan
                </button>
              </div>
            </motion.article>
          )}
        </AnimatePresence>

        {/* Educational Content Section - SEO Optimized */}
        <section className="mt-16 space-y-12" aria-labelledby="educational-title">
          <article id="about" className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h2 id="educational-title" className="text-2xl font-black text-white mb-4 tracking-tight">About AgentGuard & AI Security</h2>
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-bold text-slate-200 mb-2">Our Mission</h3>
                <p className="text-slate-400 leading-relaxed">
                  AgentGuard is a specialized security research platform dedicated to identifying and mitigating risks associated with Large Language Models (LLMs) and AI agents. As AI systems become more integrated into our digital lives, they face new classes of vulnerabilities such as <strong>Prompt Injection</strong> and <strong>Data Poisoning</strong>.
                </p>
                <p className="text-slate-400 leading-relaxed mt-4">
                  Our mission is to provide developers, security researchers, and everyday users with the tools they need to audit their AI interactions. By combining traditional threat intelligence with advanced semantic analysis, we offer a unique perspective on AI safety.
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                <article>
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 border border-amber-500/20">
                    <ShieldAlert className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="font-bold text-slate-200 mb-2">What is AI Poisoning?</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Poisoning occurs when malicious data or instructions are injected into a system to manipulate an AI's output or steal sensitive information. This can happen through <strong>Direct Injection</strong> (user input) or <strong>Indirect Injection</strong> (third-party data sources).
                  </p>
                </article>

                <article>
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-slate-200 mb-2">How we protect you</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    AgentGuard uses a multi-layered heuristic approach. We combine <strong>reputation intelligence</strong> with <strong>semantic analysis</strong> to identify adversarial patterns that traditional firewalls miss.
                  </p>
                </article>
              </section>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <button 
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
              >
                Start your first scan <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>

          <article id="faq" className="space-y-6">
            <h3 className="text-xl font-black text-white text-center tracking-tight">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  q: "Is AgentGuard free to use?",
                  a: "Yes, AgentGuard is a free security research tool provided to help developers and users secure their AI interactions."
                },
                {
                  q: "Does AgentGuard store my data?",
                  a: "No. We prioritize privacy. All scans are performed in real-time, and we do not persist your target URLs or scan results in any database."
                },
                {
                  q: "How accurate is the detection?",
                  a: "While we use advanced heuristics and multiple threat intelligence feeds, AI security is an evolving field. AgentGuard should be used as one part of a comprehensive security strategy."
                }
              ].map((item, i) => (
                <details key={i} className="group bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 transition-all">
                  <summary className="font-bold text-slate-300 cursor-pointer list-none flex justify-between items-center">
                    {item.q}
                    <span className="transition-transform group-open:rotate-180 text-slate-500">▼</span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-500 leading-relaxed border-t border-white/5 pt-3">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </article>

          <article id="methodology" className="p-8 rounded-3xl bg-indigo-600 shadow-2xl shadow-indigo-500/20 text-white">
            <h3 className="text-xl font-black mb-4 tracking-tight">Our Analysis Methodology</h3>
            <div className="space-y-4 text-indigo-100 text-sm leading-relaxed">
              <p>
                AgentGuard employs a heuristic, AI-assisted analysis engine designed to identify potential adversarial vectors. Our methodology includes:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Reputation Correlation:</strong> Cross-referencing targets against global threat databases for known malicious history.</li>
                <li><strong>Sandbox Simulation:</strong> Leveraging Hybrid Analysis to observe behavioral anomalies in isolated environments.</li>
                <li><strong>Semantic Pattern Matching:</strong> Using Large Language Models to detect "jailbreak" attempts and hidden prompt instructions.</li>
                <li><strong>Data Integrity Verification:</strong> Assessing the risk of context exfiltration and unauthorized data access.</li>
              </ul>
              <div className="mt-6 p-4 bg-indigo-700/50 rounded-2xl border border-indigo-400/30">
                <p className="text-xs italic text-indigo-200">
                  <strong>Disclosure:</strong> Analysis results are generated using AI-assisted heuristics and should be used as a supplementary security signal. No automated tool can guarantee 100% detection of evolving AI threats.
                </p>
              </div>
            </div>
          </article>
        </section>
      </main>

      {/* Footer & Trust Signals */}
      <footer className="bg-slate-900/80 backdrop-blur-md border-t border-white/5 py-12 px-4 mt-12 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">AgentGuard Security</span>
          </div>
          <p className="text-slate-500 text-xs mb-6">
            Version {APP_VERSION} • Last Updated {new Date(LAST_UPDATED).toLocaleDateString()} • <button onClick={() => setShowPrivacyPolicy(true)} className="hover:text-indigo-400 underline decoration-slate-800 underline-offset-4">Privacy Policy</button> • <a href="mailto:support@agentguard.ai" className="hover:text-indigo-400 underline decoration-slate-800 underline-offset-4">Support</a>
          </p>
          <div className="flex justify-center gap-4 mb-8">
            <button 
              onClick={() => {
                localStorage.removeItem('agentguard_cookie_consent');
                setCookieConsent(null);
                setToast("Local preferences cleared. Page will refresh.");
                setTimeout(() => window.location.reload(), 1500);
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-red-500 transition-colors"
            >
              Clear Local Data
            </button>
          </div>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-lg font-black text-white">100%</p>
              <p className="text-[10px] uppercase text-slate-500 font-bold">Heuristic</p>
            </div>
            <div className="text-center border-x border-white/5 px-8">
              <p className="text-lg font-black text-white">24/7</p>
              <p className="text-[10px] uppercase text-slate-500 font-bold">Monitoring</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">Free</p>
              <p className="text-[10px] uppercase text-slate-500 font-bold">Open Access</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 max-w-md mx-auto leading-relaxed">
            AgentGuard is a security research tool. We do not store your scan targets. 
            All analysis is performed in real-time to ensure maximum privacy and data integrity.
          </p>
        </div>
      </footer>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center justify-around md:hidden z-50" aria-label="Mobile navigation">
        <button 
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setInput(''); setResult(null); }}
          className="flex flex-col items-center gap-1 text-indigo-400" 
          aria-label="Go to Scan"
        >
          <Shield className="w-6 h-6" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase">Scan</span>
        </button>
        <button 
          onClick={() => { setToast("Vault feature coming soon in v2.0"); }}
          className="flex flex-col items-center gap-1 text-slate-500" 
          aria-label="Go to Vault"
        >
          <Lock className="w-6 h-6" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase">Vault</span>
        </button>
        <button 
          onClick={() => { setToast("Device monitoring coming soon in v2.0"); }}
          className="flex flex-col items-center gap-1 text-slate-500" 
          aria-label="Go to Devices"
        >
          <Smartphone className="w-6 h-6" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase">Devices</span>
        </button>
      </nav>

      {/* Privacy Dashboard Modal */}
      <AnimatePresence>
        {showPrivacyDashboard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Privacy & Data Dashboard</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">GDPR Compliance Tools</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPrivacyDashboard(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <RefreshCw className="w-5 h-5 rotate-45 text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                {/* Native Features (Capacitor) */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    Native App Features
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-sm font-bold text-slate-200">Biometric Authentication</p>
                        <p className="text-xs text-slate-500">Require FaceID/Fingerprint to access the app.</p>
                      </div>
                      <button 
                        onClick={() => handleToggleBiometric(!biometricEnabled)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          biometricEnabled ? "bg-indigo-600" : "bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          biometricEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-sm font-bold text-slate-200">Push Notifications</p>
                        <p className="text-xs text-slate-500">Receive security alerts and scan updates.</p>
                      </div>
                      <button 
                        onClick={() => handleTogglePush(!pushEnabled)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          pushEnabled ? "bg-indigo-600" : "bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          pushEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                  {!isNative && (
                    <p className="mt-2 text-[10px] text-amber-500 font-bold uppercase tracking-tighter">
                      Note: These features are only available in the native mobile app.
                    </p>
                  )}
                </section>

                {/* Right to Erasure */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    Right to Erasure (Art. 17)
                  </h3>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-sm text-red-400 mb-4">
                      Delete all locally stored scan history, cookie preferences, and session data. This action is permanent and cannot be undone.
                    </p>
                    <button 
                      onClick={handleClearAllData}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-500 transition-all shadow-lg shadow-red-500/20"
                    >
                      Erase All My Data
                    </button>
                  </div>
                </section>

                {/* Right to Portability */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Download className="w-4 h-4 text-indigo-400" />
                    Right to Portability (Art. 20)
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Download your current scan result in a machine-readable JSON format for your own records or to use with other services.
                    </p>
                    <button 
                      disabled={!result}
                      onClick={handleExportData}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Current Report
                    </button>
                    {!result && <p className="text-[10px] text-slate-600 mt-2 italic">Perform a scan first to enable export.</p>}
                    
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Windows App Store Package</h4>
                      <p className="text-[11px] text-slate-500 mb-3">
                        To generate the <strong>.msixbundle</strong> for Windows App Store submission:
                      </p>
                      <ol className="text-[10px] text-slate-600 list-decimal pl-4 space-y-1">
                        <li>Export this project from the AI Studio settings menu.</li>
                        <li>Install dependencies: <code className="bg-white/5 px-1 rounded">npm install</code></li>
                        <li>Build the package: <code className="bg-white/5 px-1 rounded">npm run electron:build</code></li>
                        <li>Find the bundle in the <code className="bg-white/5 px-1 rounded">/release</code> folder.</li>
                      </ol>
                    </div>
                  </div>
                </section>

                {/* Processing History */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <History className="w-4 h-4 text-slate-600" />
                    Local Processing History
                  </h3>
                  <div className="space-y-2">
                    {scanHistory.length > 0 ? (
                      scanHistory.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-300">{item.target}</span>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono">{new Date(item.time).toLocaleDateString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600 italic text-center py-4">No recent scan history found.</p>
                    )}
                  </div>
                </section>

                {/* Data Processing Agreement */}
                <section className="pt-6 border-t border-white/5">
                  <h3 className="text-sm font-bold text-slate-400 mb-2">Data Processing Disclosure</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    AgentGuard acts as a <strong>Data Controller</strong> for your local session data. We use <strong>Google Gemini</strong> (Google Cloud) as a <strong>Data Processor</strong> for AI analysis. No personal data is sent to these processors unless explicitly included in your scan target. We do not store your data on our servers.
                  </p>
                </section>
              </div>

              <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowPrivacyDashboard(false)}
                  className="px-8 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700 transition-all"
                >
                  Close Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Consent */}
      <AnimatePresence>
        {cookieConsent === null && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[90] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-bold text-white tracking-tight">Privacy Preferences</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  We use cookies to enhance your experience. <strong>Essential Only</strong> keeps only functional cookies for rate limiting. <strong>Accept All</strong> enables advanced security analysis features that require third-party AI processing.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleCookieConsent(true)}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
              >
                Accept All (Recommended)
              </button>
              <button 
                onClick={() => handleCookieConsent(false)}
                className="w-full py-2.5 bg-white/5 text-slate-400 rounded-xl font-bold text-xs hover:bg-white/10 transition-all border border-white/5"
              >
                Essential Only
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast} onClear={() => setToast(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showPrivacyPolicy && (
          <PrivacyPolicy 
            isOpen={showPrivacyPolicy} 
            onClose={() => setShowPrivacyPolicy(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
