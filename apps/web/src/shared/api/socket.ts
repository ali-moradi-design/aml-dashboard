"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/shared/config/env";

let socket: Socket | null = null;

// In production the API sits under a path (https://host/api), so Socket.IO connects to the
// origin with that path prefix; a path in the URL itself would be read as a namespace.
const api = new URL(API_URL);
const socketPath = `${api.pathname.replace(/\/$/, "")}/socket.io`;

/** One shared Socket.IO connection, authenticated by the same session cookie as the API. */
export const getSocket = () => {
  if (!socket)
    socket = io(api.origin, {
      path: socketPath,
      withCredentials: true,
      transports: ["websocket"],
      autoConnect: true,
    });
  return socket;
};

export const closeSocket = () => {
  socket?.close();
  socket = null;
};
