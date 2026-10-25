import { Router } from "express";
import { errAsync, okAsync } from "neverthrow";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { appError } from "./shared/errors";
import { handle } from "./shared/http";

const appWith = (router: Router) =>
  createApp({ webOrigin: "http://localhost:3000", routes: { "/test": router } });

describe("HTTP layer", () => {
  it("sends Ok results as JSON", async () => {
    const res = await request(
      appWith(
        Router().get(
          "/",
          handle(() => okAsync({ hello: "world" })),
        ),
      ),
    ).get("/test");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hello: "world" });
  });

  it("maps domain errors to HTTP status codes", async () => {
    const res = await request(
      appWith(
        Router().get(
          "/",
          handle(() => errAsync(appError.notFound("No such alert"))),
        ),
      ),
    ).get("/test");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: "NotFound", message: "No such alert" });
  });

  it("answers unknown routes with 404", async () => {
    const res = await request(appWith(Router())).get("/missing");
    expect(res.status).toBe(404);
  });
});
