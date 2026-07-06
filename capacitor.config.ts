import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agentguard.app',
  appName: 'AgentGuard',
  webDir: 'dist',
  backgroundColor: '#0f172a',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f172a'
  },
  android: {
    backgroundColor: '#0f172a'
  }
};

export default config;
