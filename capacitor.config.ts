import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cecilia.tileclear',
  appName: 'Tile Clear',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

