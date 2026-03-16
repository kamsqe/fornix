import tailwindcss from "@tailwindcss/vite";
import {defineConfig} from "astro/config";
export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],

    routing: {
      prefixDefaultLocale: false
    }
  },

  vite: {
    plugins: [tailwindcss()]
  }
});