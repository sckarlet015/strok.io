import type { CapacitorConfig } from "@capacitor/cli";

// Dev emulador Android: 10.0.2.2 = host machine
// Dev dispositivo fisico: usa tu IP local (192.168.x.x)
// Prod: cambia a tu URL de Vercel (e.g. "https://strok.io")
const serverUrl = process.env.CAP_SERVER_URL || "http://10.0.2.2:3000";

const config: CapacitorConfig = {
  appId: "io.strok.app",
  appName: "Strok.io",
  webDir: "out",
  server: {
    // Native app loads the deployed web app
    url: serverUrl,
    // Allow cleartext for local dev (http://192.168.x.x:3000)
    cleartext: serverUrl.startsWith("http://"),
  },
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
