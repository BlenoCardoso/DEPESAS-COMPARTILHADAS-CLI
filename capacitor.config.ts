import 'dotenv/config';
import type { CapacitorConfig } from '@capacitor/cli';

const googleServerClientId =
  process.env.VITE_FIREBASE_WEB_CLIENT_ID ||
  process.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  process.env.GOOGLE_WEB_CLIENT_ID ||
  '';

const config: CapacitorConfig = {
  appId: 'com.despesas.compartilhadas',
  appName: 'Despesas Compartilhadas',
  webDir: 'dist/public',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: googleServerClientId || undefined,
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
