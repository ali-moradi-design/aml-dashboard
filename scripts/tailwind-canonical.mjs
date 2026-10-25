// Finds Tailwind classes that have a shorter canonical spelling: the same check as the
// "suggestCanonicalClasses" warning in Tailwind CSS IntelliSense (VS Code and other editors).
// It loads the project's own design system (globals.css), so theme tokens count too.
// The official `tailwindcss canonicalize` CLI only reads class lists; this walks the source files.
//
//   node scripts/tailwind-canonical.mjs apps/web          list classes to change
//   node scripts/tailwind-canonical.mjs apps/web --fix    rewrite them in place
//
// `rem: 16` matches the editor's default root font size, so `w-[248px]` becomes `w-62`.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const web = resolve(process.argv[2]);
const fix = process.argv.includes("--fix");
const require = createRequire(join(web, "package.json"));
const tw = await import(pathToFileURL(require.resolve("tailwindcss")).href);
const __unstable__loadDesignSystem =
  tw.__unstable__loadDesignSystem ?? tw.default.__unstable__loadDesignSystem;

const cssPath = join(web, "src/_app/styles/globals.css");
const loadStylesheet = async (id, base) => {
  let path;
  if (id.startsWith(".")) path = resolve(base, id);
  else {
    const pkg = id === "tailwindcss" ? "tailwindcss/index.css" : id;
    try {
      path = require.resolve(pkg, { paths: [base] });
    } catch {
      const dir = join(web, "node_modules", id);
      const p = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      const style = p.style ?? p.exports?.["."]?.style ?? "index.css";
      path = join(dir, style);
    }
  }
  return { path, base: dirname(path), content: readFileSync(path, "utf8") };
};
const ds = await __unstable__loadDesignSystem(readFileSync(cssPath, "utf8"), {
  base: dirname(cssPath),
  loadStylesheet,
});

const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) {
      if (n !== "node_modules" && !n.startsWith(".")) walk(p);
    } else if (/\.(tsx?|css)$/.test(n)) files.push(p);
  }
};
walk(join(web, "src"));
walk(join(web, "app"));

const STR = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
let total = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  let changed = false;
  lines.forEach((line, i) => {
    const out = line.replace(STR, (whole, q, body) => {
      const tokens = body.split(/(\s+)/);
      let touched = false;
      const next = tokens.map((t) => {
        if (!t.trim() || t.includes("${")) return t;
        const css = ds.candidatesToCss([t])[0];
        if (!css) return t;
        const [canon] = ds.canonicalizeCandidates([t], { rem: 16 });
        if (canon && canon !== t) {
          total++;
          console.log(`${file.slice(web.length + 1)}:${i + 1}  ${t}  ->  ${canon}`);
          touched = true;
          return canon;
        }
        return t;
      });
      return touched ? q + next.join("") + q : whole;
    });
    if (out !== line) {
      lines[i] = out;
      changed = true;
    }
  });
  if (fix && changed) writeFileSync(file, lines.join("\n"));
}
console.log(`\n${total} class(es) ${fix ? "rewritten" : "to rewrite"}`);
