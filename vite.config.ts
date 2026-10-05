import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// Shown at the bottom of the admin sidebar so the team can tell which version of the site is live.
const build = {
  sha: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local").slice(0, 7),
  at: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
};

export default defineConfig(({ mode }) => ({
  define: { __BUILD_SHA__: JSON.stringify(build.sha), __BUILD_AT__: JSON.stringify(build.at) },
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
