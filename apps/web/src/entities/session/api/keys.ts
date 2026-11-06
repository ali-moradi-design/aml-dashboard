// No "use client": server components read these keys too (session prefetch in the app layout).
export const sessionKeys = {
  all: ["session"] as const,
  me: () => [...sessionKeys.all, "me"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
};
