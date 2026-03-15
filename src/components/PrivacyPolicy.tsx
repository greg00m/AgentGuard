import React from 'react';
import { motion } from 'motion/react';
import { X, Shield, Lock, Eye, FileText, Globe, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Privacy Policy</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Close privacy policy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-slate-600 leading-relaxed">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Introduction</h3>
            </div>
            <p className="text-sm">
              Welcome to AgentGuard ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our website and in using our services. This Privacy Policy explains how we collect, use, and safeguard the information you provide when using the AgentGuard AI Poisoning Detector.
            </p>
            <p className="text-sm mt-2">
              <strong>Effective Date:</strong> March 9, 2026.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Data Collection & Processing</h3>
            </div>
            <p className="text-sm">
              AgentGuard is designed as a privacy-first security tool. We collect the following information:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li><strong>Scan Targets:</strong> URLs or text snippets you voluntarily provide for security analysis. Please note that submitted URLs may contain personal data (e.g., in query parameters) and are processed transiently only.</li>
              <li><strong>Technical Metadata:</strong> Basic browser information (User Agent, IP address) required for security and rate limiting.</li>
            </ul>
            <p className="text-sm mt-2">
              We <strong>do not</strong> collect personal identifying information (PII) such as names, email addresses, or phone numbers unless you explicitly provide them for support purposes.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Purpose & Lawful Basis (GDPR)</h3>
            </div>
            <p className="text-sm">
              Under the General Data Protection Regulation (GDPR), our lawful basis for processing your data is:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li><strong>Legitimate Interest (Art. 6(1)(f)):</strong> We have a legitimate interest in providing a security service that identifies AI poisoning risks and protecting our infrastructure from abuse.</li>
              <li><strong>Consent:</strong> By entering a URL or text for scanning, you explicitly consent to its processing for analysis.</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>Data Controller:</strong> AgentGuard Security Research Team.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Third-Party Processors & DPA</h3>
            </div>
            <p className="text-sm">
              To perform security analysis, your scan targets are shared with the following third-party processors. We have <strong>signed Data Processing Agreements (DPA)</strong> in place with our core infrastructure providers, including Google, covering the Gemini API under GDPR Article 28:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li><strong>Google Gemini API:</strong> For semantic and heuristic AI analysis.</li>
              <li><strong>VirusTotal:</strong> For reputation and malware scanning.</li>
              <li><strong>Hybrid Analysis:</strong> For sandbox behavioral analysis.</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>Retention:</strong> Scan data is processed transiently and not persisted in our databases. Technical logs are kept for a maximum of 24 hours for rate limiting and security purposes.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">App Store Privacy Declaration</h3>
            </div>
            <p className="text-sm">
              In accordance with Apple App Store and Google Play requirements, we declare the following data practices:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li><strong>Data Not Linked to You:</strong> Scan targets and technical metadata are not linked to your identity.</li>
              <li><strong>Data Not Used for Tracking:</strong> We do not use your data to track you across third-party apps or websites.</li>
              <li><strong>Network Transmission:</strong> All user-entered URLs are transmitted securely via HTTPS to our servers and then to the Gemini API for analysis.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Disclaimers & Scope</h3>
            </div>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li><strong>Scope:</strong> AgentGuard analyzes specific URLs or text inputs. It <strong>does not</strong> scan your device, local network, or general user traffic.</li>
              <li><strong>Not Endpoint Protection:</strong> This tool is for research and informational purposes only. It is <strong>not a replacement for endpoint protection</strong>, antivirus software, or a comprehensive security suite.</li>
              <li><strong>Auto-Trigger Behavior:</strong> If you follow a "Share" link, the app may prompt you to auto-trigger a scan for the shared target. This behavior is documented to preempt concerns regarding unauthorized remote execution.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Your Rights (GDPR/CCPA)</h3>
            </div>
            <p className="text-sm">
              Depending on your location, you have the right to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li><strong>Access:</strong> Request a copy of the data we have about you (which is minimal).</li>
              <li><strong>Erasure:</strong> Request deletion of your data.</li>
              <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
              <li><strong>Withdrawal:</strong> Withdraw consent at any time.</li>
            </ul>
            <p className="text-sm mt-2">
              To exercise these rights, please contact us using the information below.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Support & Feedback</h3>
            </div>
            <p className="text-sm">
              For technical support, bug reports, or security disclosures, please contact our support team at:
              <br />
              <a href="mailto:support@agentguard.ai" className="font-bold text-indigo-600 hover:underline">support@agentguard.ai</a>
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Contact Us & Data Subject Rights</h3>
            </div>
            <p className="text-sm">
              If you have questions about this policy or our privacy practices, or if you wish to exercise your rights (access, erasure, portability, objection), please contact our Data Protection Officer at:
              <br />
              <a href="mailto:privacy@agentguard.ai" className="font-bold text-indigo-600 hover:underline">privacy@agentguard.ai</a>
            </p>
            <p className="text-[10px] text-slate-400 mt-2 italic">
              Note: As we do not persist scan data, we may require additional information to verify your identity and locate any transient logs related to your request.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Compliance: GDPR, CCPA, Apple App Store, Google Play, Microsoft Store.
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Age Rating: 12+ (Security Research & Threat Intelligence)
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Hosted URL: <a href="/privacy" target="_blank" className="text-indigo-600 hover:underline">agentguard.ai/privacy</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            I Understand
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
