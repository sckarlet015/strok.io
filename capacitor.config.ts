import type { CapacitorConfig } from "@capacitor/cli";

// Dev emulador Android: CAP_SERVER_URL=http://10.0.2.2:3000
// Dev dispositivo fisico: CAP_SERVER_URL=http://192.168.x.x:3000
// Prod: URL de Vercel
const serverUrl = process.env.CAP_SERVER_URL || "https://strok-io.vercel.app";

const config: CapacitorConfig = {
  appId: "io.strok.app",
  appName: "Strok.io",
  webDir: "out",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    // Append to user-agent so middleware + client can detect Capacitor
    androidScheme: "https",
  },
  appendUserAgent: "CapacitorApp",
  ios: {
    contentInset: "always",
    preferredContentMode: "mobile",
    scheme: "Strok",
  },
  android: {
    backgroundColor: "#1a1a2e",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#1a1a2e",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
