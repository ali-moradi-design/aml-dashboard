"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/shared/config/env";

let socket: Socket | null = null;

/** One shared Socket.IO connection, authenticated by the same session cookie as the API. */
export const getSocket = () => {
  if (!socket) socket = io(API_URL, { withCredentials: true, transports: ["websocket"], autoConnect: true });
  return socket;
};

export const closeSocket = () => {
  socket?.close();
  socket = null;
};
