import { mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import multer from "multer";
import { newSessionToken } from "./crypto";

/** Disk uploads with random file names, a size limit and a MIME allowlist. */
export const createUploader = (storageDir: string, sub: string, opts: { allowed: ReadonlySet<string>; maxBytes: number }) => {
  const dir = resolve(storageDir, sub);
  mkdirSync(dir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({ destination: dir, filename: (_req, file, cb) => cb(null, `${newSessionToken()}${extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: opts.maxBytes },
    fileFilter: (_req, file, cb) => cb(null, opts.allowed.has(file.mimetype)),
  });
  return { dir, upload };
};

export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
