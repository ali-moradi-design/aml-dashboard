"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSocket } from "@/shared/api/socket";
import { caseKeys } from "./queries";

/**
 * Joins the case room over Socket.IO and refetches what changed when a teammate acts.
 * The server only lets members of the case in (access layer 4), so `live` says whether it worked.
 */
export const useCaseLive = (code: string, enabled: boolean) => {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    const join = () => socket.emit("case:join", code, (ok: boolean) => setLive(ok));
    const onUpdated = () => {
      void qc.invalidateQueries({ queryKey: caseKeys.detail(code) });
      void qc.invalidateQueries({ queryKey: [...caseKeys.all, "list"] });
      void qc.invalidateQueries({ queryKey: [...caseKeys.all, "board"] });
    };
    const onComment = () => {
      void qc.invalidateQueries({ queryKey: caseKeys.comments(code) });
      void qc.invalidateQueries({ queryKey: caseKeys.detail(code) });
    };
    const onDisconnect = () => setLive(false);

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("case:updated", onUpdated);
    socket.on("case:comment", onComment);
    return () => {
      socket.emit("case:leave", code);
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("case:updated", onUpdated);
      socket.off("case:comment", onComment);
      setLive(false);
    };
  }, [code, enabled, qc]);

  return live;
};
