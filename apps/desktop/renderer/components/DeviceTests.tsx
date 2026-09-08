import { useEffect, useRef, useState } from "react";
import { Mic, Video, Square } from "lucide-react";
import type { Settings } from "../../../../packages/shared/protocol";
export function DeviceTests({ settings }: { settings: Settings }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const generation = useRef(0);
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState("");
  const [camera, setCamera] = useState(false);
  const stop = () => {
    ++generation.current;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    clearInterval(timer.current);
    void context.current?.close();
    context.current = null;
    setActive(false);
    setLevel(0);
  };
  useEffect(
    () => () => {
      ++generation.current;
      stream.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timer.current);
      void context.current?.close();
    },
    [],
  );
  const start = async (withCamera: boolean) => {
    stop();
    const current = generation.current;
    setMessage("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.microphoneId
            ? { exact: settings.microphoneId }
            : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: withCamera
          ? {
              deviceId: settings.cameraId
                ? { exact: settings.cameraId }
                : undefined,
              width: { ideal: 640 },
              height: { ideal: 360 },
            }
          : false,
      });
      if (current !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setCamera(withCamera);
      setActive(true);
      if (video.current) {
        video.current.srcObject = media;
        void video.current.play();
      }
      const ctx = new AudioContext();
      context.current = ctx;
      await ctx.resume();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(media).connect(analyser);
      analyser.fftSize = 256;
      const data = new Uint8Array(256);
      timer.current = setInterval(() => {
        analyser.getByteTimeDomainData(data);
        setLevel(
          Math.min(
            100,
            Math.sqrt(data.reduce((n, v) => n + (v - 128) ** 2, 0) / 256) * 3,
          ),
        );
      }, 100);
    } catch {
      setMessage(
        "Perangkat tidak dapat dibuka. Periksa pilihan dan izin Windows.",
      );
    }
  };
  return (
    <div className="device-tests">
      <div className="request-actions">
        <button className="secondary" onClick={() => void start(false)}>
          <Mic size={16} />
          Tes mikrofon
        </button>
        {settings.role === "TEACHER" && (
          <button className="secondary" onClick={() => void start(true)}>
            <Video size={16} />
            Tes kamera
          </button>
        )}
      </div>
      <video
        ref={video}
        className={active && camera ? "test-video" : "hidden"}
        muted
        autoPlay
        playsInline
      />
      {active && (
        <>
          <div className="meter" aria-label="Level mikrofon uji">
            <span style={{ width: `${level}%` }} />
          </div>
          <small>Tes lokal aktif. Audio tidak dikirim atau direkam.</small>
          <button className="secondary" onClick={stop}>
            <Square size={14} />
            Hentikan tes
          </button>
        </>
      )}
      {message && <p className="notice">{message}</p>}
    </div>
  );
}
