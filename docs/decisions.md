# Decisions and open items

## Design

- Figma file: https://www.figma.com/design/4m6IvhbOp9KR278KUf1z2d
- Light theme is the default; dark theme uses the same token names.
- Color: blues from https://coolors.co/palette/00296b-003f88-00509d-fdc500-ffd500
  for the interface. Yellow is used only for medium risk and warnings, never as
  a decorative accent. Red, yellow and green are reserved for risk levels.
- Fonts: Huninn for all English (Latin) text, Geist Mono for IDs, IBANs and
  account numbers, Yekan Bakh for Persian and Arabic (replaced the temporary
  Vazirmatn).
  All fonts are self-hosted in the repo (font files loaded locally, for example
  with `next/font/local`), not loaded from a font CDN. Huninn (jf open-huninn)
  is under the SIL Open Font License; keep its license file next to the font.
- Huninn has a single weight (Regular). English hierarchy comes from size,
  color and spacing, not from bold. Persian styles use Yekan Bakh, which ships
  eight weights (100-500, 700-900; no 600).
- Text styles in Figma: `en/*`, `fa/*` and `mono/ID` (Display, Heading 1-3,
  KPI, Body large, Body, Body small, Caption). Each style's font family is bound
  to a Typography variable, so a font swap is one variable change.
- The Figma plan allows one mode per variable collection, so light and dark
  colors live in two collections ("Color Light", "Color Dark") with the same
  variable names. In code they become one set of CSS variables.

## Visual style

- Reference: the "Vaulto" finance dashboard (Orbix Studio). Neutral graphite
  grays with no blue tint, thin borders, monochrome charts, and one accent
  color for the single most important data point. The accent is the project
  blue, not orange, because red, yellow and green mean risk levels here.
- Light theme uses the blue palette (blue-tinted grays, blue charts); the
  author preferred it over the neutral version. Dark theme keeps the Vaulto
  look: near-black page, graphite cards, monochrome charts with blue accent.

## Logo

- Mark: a rounded square with a rising path of transaction dots that ends in
  a ringed dot ("finding the signal"). Files: `docs/brand/logo-mark.svg`
  (light) and `docs/brand/logo-mark-dark.svg` (dark).
- Colors: navy tile with a soft diagonal gradient (#003F88 to #00296B). The
  path fades from light blue (#8DB8EC) to white, so the signal gets clearer
  toward the end; the end dot is white with a blue (#5B9BE0) ring. Same mark in
  both themes; in dark mode it gets a thin light-blue border to separate it
  from the black background.
- At 16px (favicon) the three small dots are dropped so the mark stays legible.

- Dark theme borrows the logo colors for interactive elements, as flat solid
  colors (no gradients in the interface; only the logo keeps its gradient):
  primary button, user avatar, active theme button, active menu row and chart
  tooltip are solid navy #003F88 with white text and icons. Menu counts are
  dark navy with light-blue text (white with navy text on the active row);
  the active row indicator and links use the logo's light blue (#8DB8EC).

## Dashboard layout

- Full-width layout. The content sits in a container with a maximum width of
  1600px, centered, so it does not stretch on very wide monitors.
- Sidebar: white (light) / near-black (dark), 248px expanded and 72px
  collapsed. Toggled by a small round button on the sidebar's right edge.
  Both states keep every menu row at the same height and position, so
  toggling never moves the menu up or down. Menu items have a hover state
  with a short (about 180 ms) ease-out transition.
- A plain app bar (white in light, graphite in dark, 64px, bottom border,
  full width) holds search, the light/dark toggle, the language menu (short
  code only: EN, DE, TR, AR, FA), notifications and the user menu (avatar,
  name, role). No dark band behind the page header.
- Charts must say something: each card title is a one-line takeaway (for
  example "Alerts rose 8% this week, but 3 in 4 were false positives"), with
  the measured metric as a small label above it. Add reference lines,
  annotations and short notes where they help the reader act.

## Open items

- [x] **Change the Persian font.** Done: Vazirmatn replaced by the commercial
      Yekan Bakh (all eight weights). The license covers web embedding and the
      public repo (confirmed by the author). The font is set in one place: Figma
      variable `Typography / font/persian` and the CSS variable `--font-persian`
      (`apps/web/src/_app/styles/fonts.ts`).
