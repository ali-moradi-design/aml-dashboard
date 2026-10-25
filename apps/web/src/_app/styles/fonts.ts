import localFont from "next/font/local";

// All fonts are self-hosted from src/shared/assets/fonts. Huninn and Geist Mono are under the
// SIL Open Font License (license files sit next to them); Yekan Bakh is a commercial font.

const huninn = localFont({
  src: "../../shared/assets/fonts/huninn/huninn-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-huninn",
  display: "swap",
});

// Extra Latin letters for German and Turkish (ä, ß, ş, ğ, ...).
const huninnExt = localFont({
  src: "../../shared/assets/fonts/huninn/huninn-latin-ext-400-normal.woff2",
  weight: "400",
  variable: "--font-huninn-ext",
  display: "swap",
});

// Persian and Arabic: Yekan Bakh, all eight weights (there is no 600).
const persian = localFont({
  src: [
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-100.woff2", weight: "100" }, // Hairline
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-200.woff2", weight: "200" }, // Thin
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-300.woff2", weight: "300" }, // Light
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-400.woff2", weight: "400" }, // Regular
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-500.woff2", weight: "500" }, // Medium
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-700.woff2", weight: "700" }, // Bold
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-800.woff2", weight: "800" }, // Heavy
    { path: "../../shared/assets/fonts/yekan-bakh/yekan-bakh-900.woff2", weight: "900" }, // Fat
  ],
  variable: "--font-persian",
  display: "swap",
});

const geistMono = localFont({
  src: "../../shared/assets/fonts/geist-mono/GeistMono-Regular.woff2",
  weight: "400",
  variable: "--font-geist-mono",
  display: "swap",
});

export const fontVariables = [huninn, huninnExt, persian, geistMono]
  .map((f) => f.variable)
  .join(" ");
