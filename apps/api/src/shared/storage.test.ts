import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createUploader, resetUploadUsage, UPLOAD_LIMITS } from "./storage";

const dir = mkdtempSync(join(tmpdir(), "aml-uploads-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
beforeEach(() => resetUploadUsage());

const { upload } = createUploader(dir, "test", { allowed: new Set(["text/csv"]), maxBytes: 1024 });
const echo: RequestHandler = (req, res) => void res.status(201).json({ size: req.file?.size ?? 0 });
const app = createApp({
  webOrigin: "http://localhost:3000",
  routes: { "/up": Router().post("/", upload.single("file"), echo) },
});
const send = (bytes: number) => request(app).post("/up").attach("file", Buffer.alloc(bytes, "a"), { filename: "rows.csv", contentType: "text/csv" });

describe("uploads", () => {
  it("accepts a file within the size limit", async () => {
    const res = await send(100);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ size: 100 });
  });

  it("answers an oversized file with 400 instead of a server error", async () => {
    const res = await send(2048);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("Validation");
  });

  it("stops a visitor after the daily upload count", async () => {
    for (let i = 0; i < UPLOAD_LIMITS.perVisitorPerDay; i++) expect((await send(10)).status).toBe(201);
    const res = await send(10);
    expect(res.status).toBe(429);
    expect(res.body.code).toBe("TooMany");
  });
});
