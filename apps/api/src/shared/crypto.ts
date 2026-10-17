import { createHash, randomBytes } from "node:crypto";

/** 256-bit random session token for the cookie. */
export const newSessionToken = () => randomBytes(32).toString("base64url");

/** Only the hash is stored, so a database leak does not leak usable sessions. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
