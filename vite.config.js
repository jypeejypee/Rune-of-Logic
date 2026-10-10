import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This tells Vite to understand React (.jsx) files.
export default defineConfig({
  plugins: [react()],
});
