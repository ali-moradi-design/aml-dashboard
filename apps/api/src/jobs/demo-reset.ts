import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ResultAsync } from "neverthrow";
import { appError } from "../shared/errors";
import { resetUploadUsage } from "../shared/storage";

const here = dirname(fileURLToPath(import.meta.url));

/** The seed script: built next to main.js in production, TypeScript source in development. */
const seedScript = () =>
  [resolve(here, "seed.js"), resolve(here, "../../prisma/seed.ts")].find((p) => existsSync(p));

/**
 * Runs the seed script in its own process. The seed empties every table and rebuilds the demo
 * data with dates relative to now. A child process keeps the seed's module state fresh each time.
 * process.execArgv carries tsx's loader in development, so the .ts source runs there too.
 */
const runSeed = () =>
  new Promise<void>((done, fail) => {
    const script = seedScript();
    if (!script) return fail(new Error("Seed script not found"));
    const child = spawn(process.execPath, [...process.execArgv, script], {
      cwd: resolve(here, script.endsWith(".ts") ? "../.." : ".."),
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", fail);
    child.on("exit", (code) =>
      code === 0 ? done() : fail(new Error(`Seed exited with code ${code}`)),
    );
  });

/** Deletes every uploaded file (case documents, news files, avatars) but keeps the folders. */
const emptyStorage = async (storageDir: string) => {
  const root = resolve(storageDir);
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    entries.map(async (e) => {
      const path = join(root, e.name);
      if (!e.isDirectory()) return rm(path, { force: true });
      const inner = await readdir(path);
      await Promise.all(
        inner.map((name) => rm(join(path, name), { recursive: true, force: true })),
      );
    }),
  );
  resetUploadUsage();
};

/** Nightly reset for the public demo: fresh data, no uploads, everyone signed out. */
export const createDemoReset = ({ storageDir }: { storageDir: string }) => ({
  run: () =>
    ResultAsync.fromPromise(
      (async () => {
        const started = Date.now();
        console.log("[demo-reset] rebuilding demo data");
        await runSeed();
        await emptyStorage(storageDir);
        console.log(`[demo-reset] done in ${Math.round((Date.now() - started) / 1000)} s`);
      })(),
      (cause) => appError.unexpected("Demo reset failed", cause),
    ),
});
export type DemoReset = ReturnType<typeof createDemoReset>;
