import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { startServer } from "../packages/signaling/server";
import {
  messageSchema,
  settingsSchema,
  privateHost,
} from "../packages/shared/protocol";
let server: Awaited<ReturnType<typeof startServer>>;
const sockets: WebSocket[] = [];
afterEach(async () => {
  sockets.forEach((s) => s.terminate());
  sockets.length = 0;
  await server?.close();
});
async function client(role: string, token?: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}/signal`);
  sockets.push(ws);
  await new Promise<void>((r) => ws.on("open", r));
  const result = next(ws);
  ws.send(
    JSON.stringify({ type: "REGISTER", role, protocolVersion: 1, token }),
  );
  await result;
  return ws;
}
function next(ws: WebSocket) {
  return new Promise<Record<string, unknown>>((resolve) =>
    ws.once("message", (data) => resolve(JSON.parse(data.toString()))),
  );
}
const send = (ws: WebSocket, type: string) => ws.send(JSON.stringify({ type }));
describe("protocol and authority", () => {
  it("rejects malformed and injected payloads", () => {
    expect(
      messageSchema.safeParse({ type: "SPEAK_APPROVED", role: "TEACHER" })
        .success,
    ).toBe(false);
    expect(
      messageSchema.safeParse({
        type: "REGISTER",
        role: "ADMIN",
        protocolVersion: 1,
      }).success,
    ).toBe(false);
    expect(settingsSchema.safeParse({ port: 80 }).success).toBe(false);
    expect(privateHost("8.8.8.8")).toBe(false);
    expect(privateHost("192.168.1.999")).toBe(false);
  });
  it("requires local Teacher token", async () => {
    server = await startServer(0, "secret", "127.0.0.1");
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/signal`);
    sockets.push(ws);
    await new Promise<void>((r) => ws.on("open", r));
    const response = next(ws);
    ws.send(
      JSON.stringify({
        type: "REGISTER",
        role: "TEACHER",
        protocolVersion: 1,
        token: "wrong",
      }),
    );
    expect((await response).type).toBe("ERROR");
  });
  it("allows request, approval, revocation, rejection and resets on disconnect", async () => {
    server = await startServer(0, "secret", "127.0.0.1");
    const teacher = await client("TEACHER", "secret");
    const student = await client("STUDENT");
    await new Promise((r) => setTimeout(r, 20));
    let response = next(teacher);
    send(student, "REQUEST_TO_SPEAK");
    expect((await response).state).toBe("REQUESTING");
    send(student, "SPEAK_APPROVED");
    response = next(teacher);
    send(student, "PING");
    await new Promise((r) => setTimeout(r, 20));
    const approved = next(student);
    send(teacher, "SPEAK_APPROVED");
    expect((await response).state).toBe("APPROVED");
    expect((await approved).state).toBe("APPROVED");
    response = next(student);
    send(teacher, "MUTE_STUDENT");
    expect((await response).state).toBe("MUTED");
    response = next(teacher);
    const requesting = next(student);
    send(student, "REQUEST_TO_SPEAK");
    await response;
    await requesting;
    response = next(student);
    const rejected = next(teacher);
    send(teacher, "SPEAK_REJECTED");
    expect((await response).state).toBe("REJECTED");
    await rejected;
    response = next(teacher);
    student.close();
    expect((await response).state).toBe("MUTED");
  });
  it("relays offer, answer and ICE and allows reconnect", async () => {
    server = await startServer(0, "secret", "127.0.0.1");
    const t = await client("TEACHER", "secret");
    let s = await client("STUDENT");
    await new Promise((r) => setTimeout(r, 20));
    let response = next(s);
    t.send(JSON.stringify({ type: "OFFER", sdp: "test-offer" }));
    expect((await response).sdp).toBe("test-offer");
    response = next(t);
    s.send(JSON.stringify({ type: "ANSWER", sdp: "test-answer" }));
    expect((await response).sdp).toBe("test-answer");
    response = next(s);
    t.send(
      JSON.stringify({
        type: "ICE_CANDIDATE",
        candidate: { candidate: "candidate:local" },
      }),
    );
    expect((await response).type).toBe("ICE_CANDIDATE");
    s.close();
    await new Promise((r) => setTimeout(r, 30));
    s = await client("STUDENT");
    expect(s.readyState).toBe(WebSocket.OPEN);
  });
});
