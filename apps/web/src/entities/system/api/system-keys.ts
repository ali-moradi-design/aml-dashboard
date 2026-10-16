// All React Query keys for this entity live here, so invalidation stays consistent.
export const systemKeys = {
  all: ["system"] as const,
  health: () => [...systemKeys.all, "health"] as const,
};
