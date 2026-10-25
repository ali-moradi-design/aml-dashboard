import { mkdirSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { RequestHandler } from "express";
import { err } from "neverthrow";
import multer from "multer";
import { newSessionToken } from "./crypto";
import { appError } from "./errors";
import { sendResult } from "./http";

const MB = 1024 * 1024;

/**
 * Limits for a public demo. Everything in storage is wiped by the nightly demo reset,
 * so these only need to stop one visitor from filling the disk within a day.
 */
export const UPLOAD_LIMITS = {
  /** All uploaded files together. */
  totalBytes: 300 * MB,
  /** Uploads per visitor (IP address) per day. */
  perVisitorPerDay: 30,
} as const;

/** Bytes used by the storage folder, recounted at most once a minute. */
const usage = { bytes: 0, countedAt: 0 };
const folderSize = async (dir: string): Promise<number> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const sizes = await Promise.all(entries.map((e) => (e.isDirectory() ? folderSize(join(dir, e.name)) : stat(join(dir, e.name)).then((s) => s.size, () => 0))));
  return sizes.reduce((a, b) => a + b, 0);
};
const usedBytes = async (root: string) => {
  if (Date.now() - usage.countedAt > 60_000) {
    usage.bytes = await folderSize(root);
    usage.countedAt = Date.now();
  }
  return usage.bytes;
};

/** Uploads per visitor for the current day (in memory; a restart starts the count again). */
const daily = { day: "", counts: new Map<string, number>() };
const countFor = (visitor: string) => {
  const today = new Date().toISOString().slice(0, 10);
  if (daily.day !== today) {
    daily.day = today;
    daily.counts.clear();
  }
  return daily.counts.get(visitor) ?? 0;
};

/** Forget cached usage, for example after the demo reset emptied the folder. */
export const resetUploadUsage = () => {
  usage.bytes = 0;
  usage.countedAt = 0;
  daily.counts.clear();
};

/**
 * Disk uploads with random file names, a MIME allowlist, a per-file size limit, a daily
 * per-visitor count and a total storage cap. `single(field)` returns the middleware chain.
 */
export const createUploader = (storageDir: string, sub: string, opts: { allowed: ReadonlySet<string>; maxBytes: number }) => {
  const root = resolve(storageDir);
  const dir = resolve(storageDir, sub);
  mkdirSync(dir, { recursive: true });
  const multerUpload = multer({
    storage: multer.diskStorage({ destination: dir, filename: (_req, file, cb) => cb(null, `${newSessionToken()}${extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: opts.maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => cb(null, opts.allowed.has(file.mimetype)),
  });
  const maxMb = Math.round(opts.maxBytes / MB);

  const guard: RequestHandler = async (req, res, next) => {
    const visitor = req.ip ?? "unknown";
    if (countFor(visitor) >= UPLOAD_LIMITS.perVisitorPerDay) {
      return void sendResult(res, err(appError.tooMany(`Upload limit reached: ${UPLOAD_LIMITS.perVisitorPerDay} files per day`)));
    }
    if ((await usedBytes(root)) + opts.maxBytes > UPLOAD_LIMITS.totalBytes) {
      return void sendResult(res, err(appError.storageFull("Demo storage is full until the nightly reset")));
    }
    next();
  };

  const single =
    (field: string): RequestHandler[] => [
      guard,
      (req, res, next) =>
        multerUpload.single(field)(req, res, (error?: unknown) => {
          if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            return void sendResult(res, err(appError.validation(`The file is larger than ${maxMb} MB`)));
          }
          if (error) return next(error);
          if (req.file) {
            const visitor = req.ip ?? "unknown";
            daily.counts.set(visitor, countFor(visitor) + 1);
            usage.bytes += req.file.size;
          }
          next();
        }),
    ];

  return { dir, upload: { single } };
};

export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
/** Case documents: like DOCUMENT_TYPES without WebP. */
export const CASE_DOCUMENT_TYPES = new Set([...DOCUMENT_TYPES].filter((t) => t !== "image/webp"));
export const MAX_DOCUMENT_BYTES = 5 * MB;
export const MAX_AVATAR_BYTES = 3 * MB;
