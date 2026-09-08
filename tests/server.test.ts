import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { startServer } from "../packages/signaling/server";
import {
  messageSchema,
  settingsSchema,
  privateHost,
  networkCode,
  parseNetworkCode,
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
    JSON.stringify({
      type: "REGISTER",
      role,
      protocolVersion: 1,
      token,
      sessionCode: server.sessionCode,
      networkCode: networkCode("127.0.0.1", server.port),
    }),
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
  it("isolates two concurrent teacher sessions and rejects a third device in an occupied room", async () => {
    server = await startServer(0, "teacher-a", "127.0.0.1");
    const other = await startServer(0, "teacher-b", "127.0.0.1");
    try {
      expect(other.sessionCode).not.toBe(server.sessionCode);
      await client("TEACHER", "teacher-a");
      const ws = new WebSocket(`ws://127.0.0.1:${other.port}/signal`);
      sockets.push(ws);
      await new Promise<void>((resolve) => ws.once("open", resolve));
      const wrongRoom = next(ws);
      ws.send(
        JSON.stringify({
          type: "REGISTER",
          role: "STUDENT",
          protocolVersion: 1,
          sessionCode: server.sessionCode,
          networkCode: networkCode("127.0.0.1", other.port),
        }),
      );
      expect((await wrongRoom).type).toBe("ERROR");
      await client("STUDENT");
      const extra = new WebSocket(`ws://127.0.0.1:${server.port}/signal`);
      sockets.push(extra);
      await new Promise<void>((resolve) => extra.once("open", resolve));
      const full = next(extra);
      extra.send(
        JSON.stringify({
          type: "REGISTER",
          role: "STUDENT",
          protocolVersion: 1,
          sessionCode: server.sessionCode,
          networkCode: networkCode("127.0.0.1", server.port),
        }),
      );
      expect((await full).type).toBe("ERROR");
    } finally {
      await other.close();
    }
  });
  it("decodes only local network codes", () => {
    expect(parseNetworkCode(networkCode("192.168.10.25", 45700))).toEqual({
      address: "192.168.10.25",
      port: 45700,
    });
    expect(parseNetworkCode(networkCode("8.8.8.8", 45700))).toBeNull();
    expect(parseNetworkCode(networkCode("192.168.1.10", 80))).toBeNull();
    expect(parseNetworkCode("MS-BAD")).toBeNull();
  });
  it("rejects missing, wrong and expired codes without occupying the student slot", async () => {
    server = await startServer(0, "secret", "127.0.0.1");
    const expired = server.sessionCode;
    await server.close();
    server = await startServer(0, "secret", "127.0.0.1");
    expect(server.sessionCode).not.toBe(expired);
    const teacher = await client("TEACHER", "secret");
    for (const codes of [
      {},
      {
        sessionCode: expired,
        networkCode: networkCode("127.0.0.1", server.port),
      },
      {
        sessionCode: server.sessionCode,
        networkCode: networkCode(
          "127.0.0.1",
          server.port === 65535 ? 45700 : server.port + 1,
        ),
      },
    ]) {
      const ws = new WebSocket(`ws://127.0.0.1:${server.port}/signal`);
      sockets.push(ws);
      await new Promise<void>((resolve) => ws.once("open", resolve));
      const response = next(ws);
      ws.send(
        JSON.stringify({
          type: "REGISTER",
          role: "STUDENT",
          protocolVersion: 1,
          ...codes,
        }),
      );
      expect((await response).type).toBe("ERROR");
    }
    const response = next(teacher);
    await client("STUDENT");
    expect((await response).type).toBe("PEER_DISCOVERED");
  });
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
