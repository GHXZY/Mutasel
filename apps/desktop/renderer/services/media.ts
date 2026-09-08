import type { Settings, Role } from "../../../../packages/shared/protocol";
export class DeviceManager {
  stream = new MediaStream();
  raw: MediaStream | null = null;
  context: AudioContext | null = null;
  gain: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  async open(
    settings: Settings,
    role: Role,
    onError: (message: string) => void,
  ) {
    this.close();
    this.stream = new MediaStream();
    try {
      this.raw = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.microphoneId
            ? { exact: settings.microphoneId }
            : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.context = new AudioContext();
      await this.context.resume();
      const source = this.context.createMediaStreamSource(this.raw);
      this.gain = this.context.createGain();
      this.gain.gain.value = settings.inputVolume / 100;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      const output = this.context.createMediaStreamDestination();
      source.connect(this.gain).connect(this.analyser).connect(output);
      output.stream.getAudioTracks().forEach((t) => {
        t.enabled = role === "TEACHER";
        this.stream.addTrack(t);
      });
    } catch {
      onError(
        "Mikrofon tidak tersedia. Periksa perangkat dan izin mikrofon Windows.",
      );
    }
    if (role === "TEACHER")
      try {
        const camera = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: settings.cameraId
              ? { exact: settings.cameraId }
              : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 30 },
          },
        });
        camera.getVideoTracks().forEach((t) => this.stream.addTrack(t));
      } catch {
        onError("Kamera tidak tersedia. Audio tetap dapat digunakan.");
      }
    return this.stream;
  }
  level() {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    return Math.min(
      100,
      Math.sqrt(data.reduce((n, v) => n + (v - 128) ** 2, 0) / data.length) * 3,
    );
  }
  close() {
    this.raw?.getTracks().forEach((t) => t.stop());
    this.stream.getTracks().forEach((t) => t.stop());
    void this.context?.close();
    this.context = null;
    this.raw = null;
    this.analyser = null;
  }
}
export async function speakerTest(deviceId: string, volume: number) {
  const context = new AudioContext();
  const output = context.createMediaStreamDestination();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 440;
  gain.gain.value = 0.12;
  oscillator.connect(gain).connect(output);
  const audio = new Audio();
  audio.srcObject = output.stream;
  audio.volume = volume / 100;
  try {
    if (deviceId) await audio.setSinkId(deviceId);
    await context.resume();
    await audio.play();
    oscillator.start();
    await new Promise((r) => setTimeout(r, 600));
    oscillator.stop();
  } finally {
    audio.pause();
    audio.srcObject = null;
    output.stream.getTracks().forEach((t) => t.stop());
    await context.close();
  }
}
