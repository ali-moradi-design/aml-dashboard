import { useQuery } from "@tanstack/react-query";
import { getHealth } from "./get-health";
import { systemKeys } from "./system-keys";

/** Hook for GET /health, polled every 30 seconds. */
export const useHealth = () =>
  useQuery({
    queryKey: systemKeys.health(),
    queryFn: getHealth,
    refetchInterval: 30_000,
  });
