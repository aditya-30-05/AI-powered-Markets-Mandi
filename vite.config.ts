import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const whisperModel = env.VITE_WHISPER_MODEL || "openai/whisper-large-v3-turbo";

  return {
    server: {
      host: "::",
      port: 8081,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api/whisper": {
          target: "https://api-inference.huggingface.co",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/whisper/, "/models"),
        },
        "/api/indic-tts": {
          target: "https://bhaasha.iiit.ac.in",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/indic-tts/, "/indic-tts/api"),
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
