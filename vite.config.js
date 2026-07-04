import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match the GitHub repo name for project pages:
// https://parikshit13.github.io/Net-Worth-Projection/
export default defineConfig({
  plugins: [react()],
  base: "/Net-Worth-Projection/",
});
