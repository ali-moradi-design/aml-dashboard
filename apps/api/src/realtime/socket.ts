import type { Server as HttpServer } from "node:http";
import { parseCookie } from "cookie";
import { Server } from "socket.io";
import type { Principal } from "../shared/access";

type Deps = {
  webOrigin: string;
  authenticate: (token: string | undefined) => Promise<Principal | null>;
  /** Membership check for joining a case room (comments are for members only). */
  canJoinCase: (p: Principal, code: string) => Promise<string | null>;
};

/**
 * Live updates over Socket.IO. Every socket is authenticated with the same session cookie as
 * the API and joins rooms: user:{id}, role:{ROLE}, and case:{id} on request (members only).
 */
export const createRealtime = (
  httpServer: HttpServer,
  { webOrigin, authenticate, canJoinCase }: Deps,
) => {
  const io = new Server(httpServer, { cors: { origin: webOrigin, credentials: true } });

  io.use(async (socket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? "");
    const principal = await authenticate(cookies.aml_session);
    if (!principal) return next(new Error("unauthorized"));
    socket.data.principal = principal;
    next();
  });

  io.on("connection", (socket) => {
    const p = socket.data.principal as Principal;
    void socket.join([`user:${p.userId}`, `role:${p.role}`]);
    socket.on("case:join", async (code: unknown, ack?: (ok: boolean) => void) => {
      const caseId = typeof code === "string" ? await canJoinCase(p, code) : null;
      if (caseId) await socket.join(`case:${caseId}`);
      ack?.(Boolean(caseId));
    });
    socket.on("case:leave", async (code: unknown) => {
      const caseId = typeof code === "string" ? await canJoinCase(p, code) : null;
      if (caseId) await socket.leave(`case:${caseId}`);
    });
  });

  const notifier = {
    toCase: (caseId: string, event: string, payload: unknown) =>
      io.to(`case:${caseId}`).emit(event, payload),
    toUser: (userId: string, event: string, payload: unknown) =>
      io.to(`user:${userId}`).emit(event, payload),
    toRole: (role: string, event: string, payload: unknown) =>
      io.to(`role:${role}`).emit(event, payload),
  };

  return { io, notifier };
};
