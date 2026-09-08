import { useEffect, useState, useRef } from "react";
import { X, Volume2 } from "lucide-react";
import type { Settings } from "../../../../packages/shared/protocol";
import { speakerTest } from "../services/media";
import { DeviceTests } from "./DeviceTests";
import { version } from "../../../../package.json";
export function SettingsPanel({
  settings,
  onSave,
  onClose,
  onRole,
  level,
}: {
  settings: Settings;
  onSave: (s: Settings) => Promise<void>;
  onClose: () => void;
  onRole: () => void;
  level: number;
}) {
  const [draft, setDraft] = useState(settings);
  const [tab, setTab] = useState("Perangkat");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const update = () => {
      void navigator.mediaDevices.enumerateDevices().then(setDevices);
    };
    update();
    navigator.mediaDevices.addEventListener("devicechange", update);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", update);
  }, []);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((s) => ({ ...s, [key]: value }));
  const save = async () => {
    setBusy(true);
    try {
      await onSave(draft);
      onClose();
    } catch {
      setMessage(
        "Pengaturan gagal disimpan. Periksa alamat lokal dan port; port mungkin sedang digunakan.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") {
          const items = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input,select",
            ) ?? [],
          ).filter((el) => el.offsetParent !== null);
          const first = items[0],
            last = items.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <section
        ref={panel}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header>
          <div>
            <span className="eyebrow">SESUAIKAN PERANGKAT ANDA</span>
            <h2 id="settings-title">Pengaturan</h2>
          </div>
          <button
            autoFocus
            className="icon-button"
            aria-label="Tutup pengaturan"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <div className="settings-tabs">
          {["Perangkat", "Jaringan", "Umum", "Tentang"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="settings-body">
          {tab === "Perangkat" && (
            <>
              <p className="muted">
                Pilih perangkat yang digunakan di ruang kelas ini.
              </p>
              <DeviceTests settings={draft} />
              {(
                [
                  { key: "cameraId", kind: "videoinput", label: "Kamera" },
                  {
                    key: "microphoneId",
                    kind: "audioinput",
                    label: "Mikrofon",
                  },
                  { key: "speakerId", kind: "audiooutput", label: "Speaker" },
                ] as const
              )
                .filter(
                  (d) => settings.role === "TEACHER" || d.key !== "cameraId",
                )
                .map(({ key, kind, label }) => (
                  <label key={key}>
                    {label}
                    <select
                      value={draft[key]}
                      onChange={(e) => set(key, e.target.value)}
                    >
                      <option value="">Perangkat default sistem</option>
                      {devices
                        .filter((d) => d.kind === kind && d.deviceId)
                        .map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `${label} ${i + 1}`}
                          </option>
                        ))}
                    </select>
                  </label>
                ))}
              <label>
                Volume mikrofon · {draft.inputVolume}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.inputVolume}
                  onChange={(e) => set("inputVolume", +e.target.value)}
                />
              </label>
              <div className="meter">
                <span style={{ width: `${level}%` }} />
              </div>
              <small className="muted">
                Level perangkat aktif. Berbicara tidak menyalakan izin mikrofon
                siswa.
              </small>
              <label>
                Volume speaker · {draft.outputVolume}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.outputVolume}
                  onChange={(e) => set("outputVolume", +e.target.value)}
                />
              </label>
              <button
                className="secondary"
                onClick={() => {
                  void speakerTest(draft.speakerId, draft.outputVolume).catch(
                    () =>
                      setMessage(
                        "Speaker tidak dapat diputar. Periksa pilihan perangkat.",
                      ),
                  );
                }}
              >
                <Volume2 size={17} /> Tes speaker
              </button>
              <small className="muted">
                Simpan untuk menerapkan perangkat. Kamera dapat diuji melalui
                pratinjau kelas.
              </small>
            </>
          )}
          {tab === "Jaringan" && (
            <>
              <p className="muted">
                Kedua komputer harus terhubung ke jaringan lokal yang sama.
              </p>
              <div className="note">
                Gunakan formulir Sambung dengan kode pada halaman Kelas.
                Masukkan kode jaringan dan kode unik sesi yang ditampilkan oleh
                ruang guru tujuan. Kode jaringan sudah memuat alamat dan port
                guru.
              </div>
              {settings.role === "TEACHER" && (
                <label>
                  Port jaringan guru
                  <input
                    type="number"
                    min="1024"
                    max="65535"
                    value={draft.port}
                    onChange={(e) => set("port", +e.target.value)}
                  />
                </label>
              )}
              <small className="muted">
                Mengubah port guru akan mengakhiri sesi lama dan membuat kode
                baru. Bagikan kembali kedua kode ke ruang kelas.
              </small>
            </>
          )}
          {tab === "Umum" && (
            <>
              <label>
                Tampilan
                <select
                  value={draft.theme}
                  onChange={(e) =>
                    set("theme", e.target.value as Settings["theme"])
                  }
                >
                  <option value="system">Ikuti sistem</option>
                  <option value="light">Terang</option>
                  <option value="dark">Gelap</option>
                </select>
              </label>
              {(
                [
                  { key: "autoStart", label: "Jalankan saat Windows menyala" },
                  { key: "autoConnect", label: "Hubungkan secara otomatis" },
                  { key: "fullscreen", label: "Mulai dalam layar penuh" },
                ] as const
              ).map(({ key, label }) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={draft[key]}
                    onChange={(e) => set(key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
              <div className="note">
                Perangkat ini:{" "}
                <strong>
                  {settings.role === "TEACHER" ? "Ruang guru" : "Ruang siswa"}
                </strong>
              </div>
              <button className="secondary" onClick={onRole}>
                Ganti peran perangkat
              </button>
            </>
          )}
          {tab === "Tentang" && (
            <>
              <h3>Mutasel: Classroom Connector</h3>
              <p>Versi {version}</p>
              <p className="muted">
                Dua ruang, satu pembelajaran. Komunikasi langsung melalui
                jaringan sekolah.
              </p>
              <div className="note">
                Tanpa internet, cloud, rekaman, database, atau pelacakan. Semua
                font dan aset tersedia di perangkat.
              </div>
            </>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </div>
        <footer>
          <button className="secondary" onClick={onClose}>
            Batal
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void save()}
          >
            Simpan pengaturan
          </button>
        </footer>
      </section>
    </div>
  );
}
