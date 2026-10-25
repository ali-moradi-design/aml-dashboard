import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import { appError } from "../../shared/errors";
import type { HealthRepository } from "./health.repository";
import { createHealthService } from "./health.service";

const fixedNow = () => new Date("2026-10-17T08:00:00.000Z");

describe("health service", () => {
  it("reports the database as up when the ping succeeds", async () => {
    const healthRepository: HealthRepository = { pingDatabase: () => okAsync(undefined) };
    const result = await createHealthService({ healthRepository, now: fixedNow }).check();

    expect(result._unsafeUnwrap()).toEqual({
      status: "ok",
      database: "up",
      time: "2026-10-17T08:00:00.000Z",
    });
  });

  it("reports the database as down instead of failing", async () => {
    const healthRepository: HealthRepository = {
      pingDatabase: () => errAsync(appError.unexpected("connection refused")),
    };
    const result = await createHealthService({ healthRepository, now: fixedNow }).check();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().database).toBe("down");
  });
});
