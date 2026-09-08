import Fastify from "fastify";
import { WebSocketServer, WebSocket } from "ws";
import {
  messageSchema,
  type Role,
  type Permission,
  type ServerMessage,
} from "../shared/protocol";
export async function startServer(
  port: number,
  teacherToken: string,
  host = "0.0.0.0",
) {
  const app = Fastify({ logger: false });
  const peers = new Map<Role, WebSocket>();
  let permission: Permission = "MUTED";
  const send = (ws: WebSocket | undefined, msg: ServerMessage) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };
  const broadcast = (msg: ServerMessage) =>
    peers.forEach((ws) => send(ws, msg));
  const setPermission = (state: Permission) => {
    permission = state;
    broadcast({ type: "PERMISSION", state });
  };
  app.get("/status", async () => ({
    service: "LOCAL_CLASSROOM_TEACHER",
    protocolVersion: 1,
    teacher: peers.has("TEACHER"),
    student: peers.has("STUDENT"),
  }));
  const wss = new WebSocketServer({
    server: app.server,
    path: "/signal",
    maxPayload: 65536,
  });
  const alive = new WeakMap<WebSocket, boolean>();
  wss.on("connection", (ws, req) => {
    let role: Role | undefined;
    let count = 0;
    let windowStart = Date.now();
    alive.set(ws, true);
    const registrationTimeout = setTimeout(() => {
      if (!role) ws.close(1008, "Registration required");
    }, 5000);
    ws.on("pong", () => alive.set(ws, true));
    ws.on("message", (raw) => {
      if (Date.now() - windowStart > 1000) {
        count = 0;
        windowStart = Date.now();
      }
      if (++count > 100) {
        ws.close(1008, "Rate limit");
        return;
      }
      let parsed;
      try {
        parsed = messageSchema.safeParse(JSON.parse(raw.toString()));
      } catch {
        send(ws, { type: "ERROR", message: "Pesan tidak valid." });
        return;
      }
      if (!parsed.success) {
        send(ws, {
          type: "ERROR",
          message:
            "Protokol tidak cocok atau pesan tidak valid. Gunakan versi aplikasi yang sama.",
        });
        return;
      }
      const m = parsed.data;
      if (m.type === "REGISTER") {
        const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
          req.socket.remoteAddress ?? "",
        );
        if (
          role ||
          peers.has(m.role) ||
          (m.role === "TEACHER" && (!local || m.token !== teacherToken))
        ) {
          send(ws, {
            type: "ERROR",
            message: "Peran tidak diizinkan atau perangkat sudah terhubung.",
          });
          ws.close(1008);
          return;
        }
        role = m.role;
        peers.set(role, ws);
        clearTimeout(registrationTimeout);
        send(ws, { type: "REGISTERED" });
        send(ws, { type: "PERMISSION", state: permission });
        if (peers.size === 2) broadcast({ type: "PEER_DISCOVERED" });
        return;
      }
      if (!role) {
        ws.close(1008);
        return;
      }
      const other = peers.get(role === "TEACHER" ? "STUDENT" : "TEACHER");
      switch (m.type) {
        case "PING":
          send(ws, { type: "PONG" });
          break;
        case "PONG":
          alive.set(ws, true);
          break;
        case "REQUEST_TO_SPEAK":
          if (role === "STUDENT" && other && permission !== "APPROVED")
            setPermission("REQUESTING");
          break;
        case "SPEAK_APPROVED":
          if (role === "TEACHER" && other) setPermission("APPROVED");
          break;
        case "SPEAK_REJECTED":
          if (role === "TEACHER" && permission === "REQUESTING")
            setPermission("REJECTED");
          break;
        case "MUTE_STUDENT":
          setPermission("MUTED");
          break;
        case "DISCONNECT":
          ws.close(1000);
          break;
        case "OFFER":
          if (role === "TEACHER") send(other, m);
          break;
        case "ANSWER":
          if (role === "STUDENT") send(other, m);
          break;
        case "ICE_CANDIDATE":
        case "CONNECTION_STATE":
          send(other, m);
          break;
      }
    });
    ws.on("error", () => {});
    ws.on("close", () => {
      clearTimeout(registrationTimeout);
      if (role && peers.get(role) === ws) {
        peers.delete(role);
        setPermission("MUTED");
        broadcast({ type: "PEER_LEFT" });
      }
    });
  });
  const heartbeat = setInterval(
    () =>
      wss.clients.forEach((ws) => {
        if (!alive.get(ws)) {
          ws.terminate();
          return;
        }
        alive.set(ws, false);
        ws.ping();
      }),
    10000,
  );
  try {
    await app.listen({ port, host });
  } catch (error) {
    clearInterval(heartbeat);
    wss.close();
    throw error;
  }
  return {
    port: (app.server.address() as { port: number }).port,
    close: async () => {
      clearInterval(heartbeat);
      wss.clients.forEach((ws) => ws.terminate());
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await app.close();
    },
  };
}
