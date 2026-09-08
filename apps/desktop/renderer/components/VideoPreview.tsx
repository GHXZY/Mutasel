import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";
export function VideoPreview({
  stream,
  local,
  visible,
  speakerId,
  volume,
  allowed = true,
}: {
  stream: MediaStream | null;
  local: boolean;
  visible: boolean;
  speakerId: string;
  volume: number;
  allowed?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);
  useEffect(() => {
    const video = ref.current;
    if (video) {
      video.volume = volume / 100;
      video.muted = local || !allowed;
      void video
        .setSinkId(speakerId)
        .catch(() =>
          setError(
            "Speaker pilihan tidak tersedia. Pilih perangkat lain di Pengaturan.",
          ),
        );
    }
  }, [speakerId, volume, local, allowed]);
  return (
    <>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={local || !allowed}
        className={visible ? "video" : "video video-hidden"}
      />
      {!visible && (
        <div className="video-empty">
          <div className="camera-orbit">
            <VideoOff size={35} />
          </div>
          <h2>{local ? "Pratinjau kamera Anda" : "Menunggu tayangan guru"}</h2>
          <p>
            {local
              ? "Aktifkan kamera untuk menampilkan ruang kelas."
              : "Tayangan akan muncul saat ruang guru terhubung."}
          </p>
        </div>
      )}
      {error && <span className="video-error">{error}</span>}
    </>
  );
}
import { useState } from "react";
