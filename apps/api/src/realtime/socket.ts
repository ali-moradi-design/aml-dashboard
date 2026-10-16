import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

/** Live updates (notifications, case comments). Rooms per user and per case are added with those features. */
export const createRealtime = (httpServer: HttpServer, webOrigin: string) => {
  const io = new Server(httpServer, { cors: { origin: webOrigin, credentials: true } });
  io.on("connection", (socket) => {
    socket.emit("welcome", { connectedAt: new Date().toISOString() });
  });
  return io;
};
