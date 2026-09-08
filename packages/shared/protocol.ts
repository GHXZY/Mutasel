import { z } from "zod";
export const roleSchema = z.enum(["TEACHER", "STUDENT"]);
export type Role = z.infer<typeof roleSchema>;
export type Permission = "MUTED" | "REQUESTING" | "APPROVED" | "REJECTED";
export type Connection =
  | "INITIALIZING"
  | "SEARCHING"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "ERROR";
export const privateHost = (v: string) =>
  v === "localhost" ||
  /^127\.0\.0\.1$/.test(v) ||
  (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(v) &&
    v.split(".").length === 4 &&
    v.split(".").every((n) => /^\d+$/.test(n) && +n <= 255));
export const settingsSchema = z
  .object({
    role: roleSchema.nullable().default(null),
    teacherAddress: z
      .string()
      .refine((v) => v === "" || privateHost(v))
      .default(""),
    port: z.number().int().min(1024).max(65535).default(45700),
    cameraId: z.string().max(300).default(""),
    microphoneId: z.string().max(300).default(""),
    speakerId: z.string().max(300).default(""),
    inputVolume: z.number().min(0).max(100).default(100),
    outputVolume: z.number().min(0).max(100).default(80),
    autoConnect: z.boolean().default(true),
    autoStart: z.boolean().default(false),
    fullscreen: z.boolean().default(false),
    theme: z.enum(["system", "light", "dark"]).default("system"),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const defaults = settingsSchema.parse({});
export const messageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("REGISTER"),
      role: roleSchema,
      protocolVersion: z.literal(1),
      token: z.string().max(128).optional(),
    })
    .strict(),
  z.object({ type: z.literal("OFFER"), sdp: z.string().max(60000) }).strict(),
  z.object({ type: z.literal("ANSWER"), sdp: z.string().max(60000) }).strict(),
  z
    .object({
      type: z.literal("ICE_CANDIDATE"),
      candidate: z
        .object({
          candidate: z.string().max(4096),
          sdpMid: z.string().nullable().optional(),
          sdpMLineIndex: z.number().nullable().optional(),
          usernameFragment: z.string().nullable().optional(),
        })
        .strict(),
    })
    .strict(),
  ...(
    [
      "REQUEST_TO_SPEAK",
      "SPEAK_APPROVED",
      "SPEAK_REJECTED",
      "MUTE_STUDENT",
      "PING",
      "PONG",
      "DISCONNECT",
    ] as const
  ).map((type) => z.object({ type: z.literal(type) }).strict()),
  z
    .object({
      type: z.literal("CONNECTION_STATE"),
      mic: z.boolean(),
      camera: z.boolean(),
    })
    .strict(),
]);
export type ClientMessage = z.infer<typeof messageSchema>;
export const serverMessageSchema = z.union([
  messageSchema,
  z.object({ type: z.literal("REGISTERED") }).strict(),
  z.object({ type: z.literal("PEER_DISCOVERED") }).strict(),
  z.object({ type: z.literal("PEER_LEFT") }).strict(),
  z
    .object({
      type: z.literal("PERMISSION"),
      state: z.enum(["MUTED", "REQUESTING", "APPROVED", "REJECTED"]),
    })
    .strict(),
  z.object({ type: z.literal("ERROR"), message: z.string().max(500) }).strict(),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;
export interface NetworkInfo {
  addresses: { name: string; address: string }[];
  serverRunning: boolean;
  port: number;
}
export interface Discovery {
  address: string;
  port: number;
  source: "mDNS" | "UDP";
}
export interface Bridge {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;
  getNetwork(): Promise<NetworkInfo>;
  discover(): Promise<Discovery[]>;
  getTeacherToken(): Promise<string>;
  fullscreen(): Promise<void>;
  getAppInfo(): Promise<{ version: string; build: string }>;
}
