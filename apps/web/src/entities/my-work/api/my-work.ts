"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { myWorkSchema } from "@aml/shared";
import { request } from "@/shared/api";
import { getSocket } from "@/shared/api/socket";

export const getMyWork = () => request("/my-work", myWorkSchema);

export const myWorkKeys = { all: ["my-work"] as const };
export const useMyWork = () => useQuery({ queryKey: myWorkKeys.all, queryFn: getMyWork, refetchInterval: 120_000 });

/** A notification (case moved to a step I work at, a mention, an assignment) refreshes the inbox. */
export const useMyWorkLive = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => void qc.invalidateQueries({ queryKey: myWorkKeys.all });
    socket.on("notification", refresh);
    return () => {
      socket.off("notification", refresh);
    };
  }, [qc]);
};
