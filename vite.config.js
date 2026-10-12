import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This tells Vite to understand React (.jsx) files.
// base: "./" makes the built game work from any folder, including Vercel and GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
