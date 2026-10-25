import localFont from "next/font/local";

// All fonts are self-hosted from src/shared/assets/fonts (SIL Open Font License files sit next to them).

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

const vazirmatn = localFont({
  src: [
    {
      path: "../../shared/assets/fonts/vazirmatn/vazirmatn-arabic-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../shared/assets/fonts/vazirmatn/vazirmatn-arabic-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../shared/assets/fonts/vazirmatn/vazirmatn-arabic-700-normal.woff2",
      weight: "700",
    },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
});

const geistMono = localFont({
  src: "../../shared/assets/fonts/geist-mono/GeistMono-Regular.woff2",
  weight: "400",
  variable: "--font-geist-mono",
  display: "swap",
});

export const fontVariables = [huninn, huninnExt, vazirmatn, geistMono]
  .map((f) => f.variable)
  .join(" ");
