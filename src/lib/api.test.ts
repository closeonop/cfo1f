import { afterEach, expect, it, vi } from "vitest";
import { api, refreshSession } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("releases a stalled signup request without retrying a possible account creation", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  }));
  vi.stubGlobal("fetch", fetch);
  const request = expect(api("/auth/onboarding", { method: "POST", skipAuth: true }))
    .rejects.toMatchObject({ status: 503, message: expect.stringContaining("taking too long") });
  await vi.advanceTimersByTimeAsync(15000);
  await request;
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("finishes a stalled initial session check within eight seconds", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  })));
  const check = refreshSession();
  await vi.advanceTimersByTimeAsync(8000);
  expect(await check).toBe(false);
  await vi.runAllTimersAsync();
});
