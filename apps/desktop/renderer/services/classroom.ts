import type {
  ClientMessage,
  Connection,
  Permission,
  Role,
  ServerMessage,
  Settings,
} from "../../../../packages/shared/protocol";
import { bridge } from "./bridge";
import { DeviceManager } from "./media";
import {
  serverMessageSchema,
  parseNetworkCode,
} from "../../../../packages/shared/protocol";
export interface Snapshot {
  presenting: boolean;
  connection: Connection;
  permission: Permission;
  local: MediaStream | null;
  remote: MediaStream | null;
  error: string;
  ws: string;
  rtc: string;
  address: string;
  peerMic: boolean;
  peerCamera: boolean;
  stats: Record<string, string>;
  logs: string[];
}
const initial: Snapshot = {
  presenting: false,
  connection: "INITIALIZING",
  permission: "MUTED",
  local: null,
  remote: null,
  error: "",
  ws: "closed",
  rtc: "new",
  address: "",
  peerMic: false,
  peerCamera: false,
  stats: {},
  logs: [],
};
export class Classroom {
  state: Snapshot = { ...initial, logs: [] };
  devices = new DeviceManager();
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private stopped = true;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private statsTimer: ReturnType<typeof setInterval> | undefined;
  private lastPong = 0;
  private generation = 0;
  private candidates: RTCIceCandidateInit[] = [];
  private audioSender: RTCRtpSender | null = null;
  private videoSender: RTCRtpSender | null = null;
  private display: MediaStream | null = null;
  private displayBusy = false;
  private previewStream() {
    return new MediaStream([
      ...this.devices.stream.getAudioTracks(),
      ...(this.display ?? this.devices.stream).getVideoTracks(),
    ]);
  }
  async startPresentation() {
    if (
      this.role !== "TEACHER" ||
      this.stopped ||
      this.displayBusy ||
      this.display
    )
      return;
    this.displayBusy = true;
    const generation = this.generation;
    let captured: MediaStream | null = null;
    try {
      captured = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15, max: 24 },
        },
      });
      if (this.stopped || generation !== this.generation) {
        captured.getTracks().forEach((t) => t.stop());
        return;
      }
      const track = captured.getVideoTracks()[0];
      track.contentHint = "detail";
      await this.videoSender?.replaceTrack(track);
      if (this.stopped || generation !== this.generation) {
        captured.getTracks().forEach((t) => t.stop());
        return;
      }
      this.display = captured;
      track.onended = () => {
        void this.stopPresentation().catch(() =>
          this.error("Kamera belum dapat dipulihkan. Hubungkan ulang kelas."),
        );
      };
      this.emit({ presenting: true, local: this.previewStream() });
      this.publishMedia();
      this.log("Presentasi layar dimulai");
    } catch (error) {
      captured?.getTracks().forEach((t) => t.stop());
      if (!(error instanceof DOMException && error.name === "NotAllowedError"))
        this.error(
          "Layar tidak dapat dibagikan. Coba kembali dan pilih layar komputer.",
        );
    } finally {
      this.displayBusy = false;
    }
  }
  async stopPresentation() {
    const display = this.display;
    if (!display) return;
    this.display = null;
    display.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.emit({
      presenting: false,
      local: this.stopped ? null : this.devices.stream,
    });
    await this.videoSender?.replaceTrack(
      this.devices.stream.getVideoTracks()[0] ?? null,
    );
    this.publishMedia();
    this.log("Presentasi berakhir; kembali ke kamera");
  }
  mic = true;
  camera = true;
  private replacing = false;
  constructor(
    public settings: Settings,
    private update: (state: Snapshot) => void,
  ) {}
  private emit(patch: Partial<Snapshot>) {
    this.state = { ...this.state, ...patch };
    this.update(this.state);
  }
  private log(message: string) {
    this.emit({
      logs: [
        `${new Date().toLocaleTimeString("id-ID")}  ${message}`,
        ...this.state.logs,
      ].slice(0, 60),
    });
  }
  private error = (message: string) => this.emit({ error: message });
  get role(): Role {
    return this.settings.role ?? "STUDENT";
  }
  async start() {
    if (
      this.role === "STUDENT" &&
      (!parseNetworkCode(this.settings.networkCode) ||
        !/^[A-F0-9]{12}$/.test(this.settings.sessionCode))
    ) {
      this.emit({
        connection: "DISCONNECTED",
        error:
          "Masukkan kode jaringan dan kode unik dari ruang guru untuk menyambung.",
      });
      return;
    }
    this.stopped = false;
    this.mic = true;
    this.camera = true;
    const generation = ++this.generation;
    this.emit({ connection: "INITIALIZING", error: "" });
    const manager = new DeviceManager();
    this.devices.close();
    this.devices = manager;
    const stream = await manager.open(this.settings, this.role, this.error);
    if (this.stopped || generation !== this.generation) {
      manager.close();
      return;
    }
    this.emit({ local: stream });
    navigator.mediaDevices.addEventListener("devicechange", this.hotplug);
    await this.connect();
  }
  private hotplug = async () => {
    if (this.replacing || this.stopped) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    const next = { ...this.settings };
    let missing =
      this.devices.raw?.getTracks().some((t) => t.readyState === "ended") ||
      this.devices.stream
        .getVideoTracks()
        .some((t) => t.readyState === "ended");
    for (const key of ["microphoneId", "cameraId", "speakerId"] as const)
      if (next[key] && !list.some((d) => d.deviceId === next[key])) {
        next[key] = "";
        missing = true;
      }
    if (missing) {
      this.error(
        "Perangkat dilepas. Beralih ke perangkat default; periksa pilihan perangkat.",
      );
      await this.replaceDevices(next);
    }
  };
  async replaceDevices(settings: Settings) {
    this.replacing = true;
    this.settings = settings;
    try {
      const stream = await this.devices.open(settings, this.role, this.error);
      if (this.stopped) {
        this.devices.close();
        return;
      }
      this.applyMute();
      await this.audioSender?.replaceTrack(stream.getAudioTracks()[0] ?? null);
      await this.videoSender?.replaceTrack(
        (this.display ?? stream).getVideoTracks()[0] ?? null,
      );
      this.emit({ local: this.previewStream() });
      this.publishMedia();
    } finally {
      this.replacing = false;
    }
  }
  async connect() {
    if (this.stopped) return;
    const generation = this.generation;
    this.emit({ connection: this.retry ? "RECONNECTING" : "SEARCHING" });
    let address = "127.0.0.1";
    let port = this.settings.port;
    if (this.role === "STUDENT") {
      const target = parseNetworkCode(this.settings.networkCode);
      if (!target) {
        this.error("Kode jaringan tidak valid.");
        return;
      }
      address = target.address;
      port = target.port;
    }
    this.emit({
      address: `${address}:${port}`,
      connection: this.retry ? "RECONNECTING" : "CONNECTING",
    });
    const token =
      this.role === "TEACHER" ? await bridge.getTeacherToken() : undefined;
    if (this.stopped || generation !== this.generation) return;
    const ws = new WebSocket(`ws://${address}:${port}/signal`);
    this.ws = ws;
    const timeout = setTimeout(() => ws.close(), 7000);
    ws.onopen = () => {
      clearTimeout(timeout);
      if (this.stopped) {
        ws.close();
        return;
      }
      this.emit({ ws: "open" });
      this.lastPong = Date.now();
      this.send({
        type: "REGISTER",
        role: this.role,
        protocolVersion: 1,
        token,
        networkCode: this.settings.networkCode,
        sessionCode: this.settings.sessionCode,
      });
      this.heartbeat = setInterval(() => {
        if (Date.now() - this.lastPong > 25000) ws.close();
        else this.send({ type: "PING" });
      }, 8000);
    };
    let messages = Promise.resolve();
    ws.onmessage = (event) => {
      messages = messages
        .then(async () => {
          if (this.ws !== ws || this.stopped) return;
          const message = serverMessageSchema.parse(JSON.parse(event.data));
          await this.message(message);
        })
        .catch((error: unknown) => {
          this.log(
            `Pemulihan media: ${error instanceof Error ? error.name : "Pesan tidak valid"}`,
          );
          this.error("Sambungan media gagal. Memulihkan koneksi kelas…");
          ws.close();
        });
    };
    ws.onerror = () =>
      this.error(
        "Koneksi belum berhasil. Periksa alamat guru, jaringan lokal, dan izin Firewall.",
      );
    ws.onclose = () => {
      clearTimeout(timeout);
      clearInterval(this.heartbeat);
      this.closePeer();
      this.emit({ ws: "closed", permission: "MUTED" });
      this.applyMute();
      if (!this.stopped) this.schedule();
    };
  }
  private schedule() {
    clearTimeout(this.timer);
    this.emit({ connection: "RECONNECTING" });
    const delay = Math.min(1000 * 2 ** this.retry++, 15000);
    this.timer = setTimeout(() => {
      void this.connect();
    }, delay);
  }
  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(message));
  }
  private async message(message: ServerMessage) {
    if (this.stopped) return;
    switch (message.type) {
      case "PONG":
        this.lastPong = Date.now();
        break;
      case "REGISTERED":
        this.log("Signaling terhubung");
        this.emit({ connection: "SEARCHING", error: "" });
        break;
      case "PEER_DISCOVERED":
        this.emit({ connection: "CONNECTING", error: "" });
        this.log("Perangkat kelas ditemukan");
        if (this.role === "TEACHER") await this.offer();
        break;
      case "PEER_LEFT":
        this.closePeer();
        this.emit({
          connection: "SEARCHING",
          permission: "MUTED",
          peerMic: false,
          peerCamera: false,
        });
        this.applyMute();
        this.log("Perangkat kelas terputus");
        break;
      case "PERMISSION":
        this.emit({ permission: message.state });
        this.applyMute();
        this.log(`Izin bicara: ${message.state}`);
        break;
      case "OFFER": {
        const pc = this.createPeer();
        await pc.setRemoteDescription({ type: "offer", sdp: message.sdp });
        await this.flushCandidates(pc);
        await pc.setLocalDescription(await pc.createAnswer());
        this.send({ type: "ANSWER", sdp: pc.localDescription!.sdp });
        this.publishMedia();
        break;
      }
      case "ANSWER":
        if (this.pc) {
          await this.pc.setRemoteDescription({
            type: "answer",
            sdp: message.sdp,
          });
          await this.flushCandidates(this.pc);
        }
        break;
      case "ICE_CANDIDATE":
        if (this.pc?.remoteDescription)
          await this.pc.addIceCandidate(message.candidate);
        else this.candidates.push(message.candidate);
        break;
      case "CONNECTION_STATE":
        this.emit({ peerMic: message.mic, peerCamera: message.camera });
        break;
      case "ERROR":
        this.error(message.message);
        this.stopped = true;
        this.ws?.close();
        this.emit({ connection: "ERROR" });
        break;
    }
  }
  private async flushCandidates(pc: RTCPeerConnection) {
    for (const candidate of this.candidates)
      await pc.addIceCandidate(candidate);
    this.candidates = [];
  }
  private createPeer() {
    this.closePeer(false);
    const pc = new RTCPeerConnection({ iceServers: [] });
    this.pc = pc;
    const remote = new MediaStream();
    this.emit({ remote });
    const audio = this.devices.stream.getAudioTracks()[0];
    const video = (this.display ?? this.devices.stream).getVideoTracks()[0];
    const transceiver = pc.addTransceiver(audio ?? "audio", {
      direction: "sendrecv",
      streams: [this.devices.stream],
    });
    this.audioSender = transceiver.sender;
    const codecs = RTCRtpReceiver.getCapabilities("audio")?.codecs.filter(
      (c) => c.mimeType.toLowerCase() === "audio/opus",
    );
    if (codecs?.length) transceiver.setCodecPreferences(codecs);
    this.videoSender = pc.addTransceiver(video ?? "video", {
      direction: this.role === "TEACHER" ? "sendonly" : "recvonly",
      streams: [this.devices.stream],
    }).sender;
    pc.ontrack = (event) => {
      remote.addTrack(event.track);
      this.emit({ remote: new MediaStream(remote.getTracks()) });
    };
    pc.onicecandidate = (event) => {
      if (event.candidate)
        this.send({
          type: "ICE_CANDIDATE",
          candidate: {
            ...event.candidate.toJSON(),
            candidate: event.candidate.candidate,
          },
        });
    };
    pc.onnegotiationneeded = () => {
      if (
        this.role === "TEACHER" &&
        ["failed", "disconnected"].includes(pc.connectionState) &&
        pc.signalingState === "stable"
      ) {
        void (async () => {
          await pc.setLocalDescription(
            await pc.createOffer({ iceRestart: true }),
          );
          if (this.pc === pc)
            this.send({ type: "OFFER", sdp: pc.localDescription!.sdp });
        })().catch(() => this.ws?.close());
      }
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      this.emit({ rtc: pc.connectionState });
      if (pc.connectionState === "connected") {
        this.retry = 0;
        this.emit({ connection: "CONNECTED", error: "" });
        this.publishMedia();
        this.log("Audio dan video terhubung");
      } else if (["failed", "disconnected"].includes(pc.connectionState)) {
        this.emit({ connection: "RECONNECTING", permission: "MUTED" });
        this.applyMute();
        this.send({ type: "MUTE_STUDENT" });
        pc.restartIce();
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          if (this.pc === pc && pc.connectionState !== "connected")
            this.ws?.close();
        }, 3000);
      }
    };
    this.statsTimer = setInterval(() => {
      void this.collectStats(pc).catch(() => {});
    }, 3000);
    return pc;
  }
  private async offer() {
    const pc = this.createPeer();
    await pc.setLocalDescription(await pc.createOffer());
    this.send({ type: "OFFER", sdp: pc.localDescription!.sdp });
    this.publishMedia();
  }
  private async collectStats(pc: RTCPeerConnection) {
    if (pc.connectionState !== "connected") return;
    const stats: Record<string, string> = {};
    const report = await pc.getStats();
    let poor = false;
    report.forEach((item) => {
      if (item.type === "candidate-pair" && item.state === "succeeded") {
        stats.RTT = `${Math.round((item.currentRoundTripTime ?? 0) * 1000)} ms`;
        poor = (item.currentRoundTripTime ?? 0) > 0.15;
      }
      if (item.type === "inbound-rtp") {
        stats[`${item.kind} jitter`] =
          `${Math.round((item.jitter ?? 0) * 1000)} ms`;
        stats[`${item.kind} lost`] = String(item.packetsLost ?? 0);
      }
      if (item.type === "outbound-rtp" && item.kind === "video")
        stats.Video = `${item.frameWidth ?? 0} × ${item.frameHeight ?? 0} · ${item.framesPerSecond ?? 0} fps`;
    });
    if (this.pc !== pc) return;
    this.emit({ stats });
    if (this.videoSender?.track) {
      const params = this.videoSender.getParameters();
      if (params.encodings?.length) {
        params.encodings[0].maxBitrate = poor ? 350000 : 1800000;
        params.encodings[0].scaleResolutionDownBy = poor ? 2 : 1;
        params.encodings[0].maxFramerate = poor ? 15 : 24;
        await this.videoSender.setParameters(params).catch(() => {});
      }
    }
  }
  private applyMute() {
    this.devices.stream
      .getAudioTracks()
      .forEach(
        (t) =>
          (t.enabled =
            this.role === "TEACHER"
              ? this.mic
              : this.state.permission === "APPROVED" && !this.stopped),
      );
    this.devices.stream
      .getVideoTracks()
      .forEach((t) => (t.enabled = this.camera));
  }
  toggleMic() {
    this.mic = !this.mic;
    this.applyMute();
    this.publishMedia();
  }
  toggleCamera() {
    this.camera = !this.camera;
    this.applyMute();
    this.publishMedia();
  }
  private publishMedia() {
    this.send({
      type: "CONNECTION_STATE",
      mic:
        this.role === "TEACHER"
          ? this.mic && !!this.devices.stream.getAudioTracks().length
          : this.state.permission === "APPROVED" &&
            !!this.devices.stream.getAudioTracks().length,
      camera:
        this.role === "TEACHER" &&
        (!!this.display ||
          (this.camera && !!this.devices.stream.getVideoTracks().length)),
    });
  }
  private closePeer(clear = true) {
    clearInterval(this.statsTimer);
    this.pc?.close();
    this.pc = null;
    this.audioSender = null;
    this.videoSender = null;
    if (clear) this.candidates = [];
    this.emit({ remote: null, rtc: "closed", stats: {} });
  }
  stop() {
    this.stopped = true;
    this.display?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.display = null;
    ++this.generation;
    clearTimeout(this.timer);
    clearInterval(this.heartbeat);
    navigator.mediaDevices.removeEventListener("devicechange", this.hotplug);
    this.send({ type: "DISCONNECT" });
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.closePeer();
    this.devices.close();
    this.emit({
      presenting: false,
      connection: "DISCONNECTED",
      permission: "MUTED",
      local: null,
      ws: "closed",
    });
  }
}
