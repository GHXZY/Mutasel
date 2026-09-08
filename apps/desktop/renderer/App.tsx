import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Monitor,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Wifi,
  Settings2,
  Activity,
  HelpCircle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Maximize,
  Hand,
  PhoneOff,
  Check,
  Radio,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import {
  defaults,
  type Settings,
  type NetworkInfo,
} from "../../../packages/shared/protocol";
import { bridge, desktop } from "./services/bridge";
import { Classroom, type Snapshot } from "./services/classroom";
import { VideoPreview } from "./components/VideoPreview";
import { SettingsPanel } from "./components/SettingsPanel";
import { SessionConnection } from "./components/SessionConnection";
import mutaselLogo from "./assets/mutasel.svg";
import { version } from "../../../package.json";
const labels = {
  INITIALIZING: "Menyiapkan perangkat",
  SEARCHING: "Menunggu ruang kelas",
  CONNECTING: "Menghubungkan",
  CONNECTED: "Terhubung",
  RECONNECTING: "Menghubungkan ulang",
  DISCONNECTED: "Tidak terhubung",
  ERROR: "Perlu diperiksa",
};
const permissionLabels = {
  MUTED: "Mikrofon siswa nonaktif",
  REQUESTING: "Menunggu izin berbicara",
  APPROVED: "Siswa boleh berbicara",
  REJECTED: "Permintaan belum disetujui",
};
export default function App() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<Snapshot>();
  const [page, setPage] = useState("Kelas");
  const [modal, setModal] = useState(false);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);
  const videoStage = useRef<HTMLDivElement>(null);
  const [speaker, setSpeaker] = useState(true);
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [level, setLevel] = useState(0);
  const [network, setNetwork] = useState<NetworkInfo>();
  const [error, setError] = useState("");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [settings.role, page]);
  const session = useRef<Classroom | null>(null);
  useEffect(() => {
    const update = () =>
      setVideoFullscreen(
        !!document.fullscreenElement &&
          document.fullscreenElement === videoStage.current,
      );
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    if (!modal) return;
    const timer = setInterval(
      () => setLevel(session.current?.devices.level() ?? 0),
      120,
    );
    return () => clearInterval(timer);
  }, [modal]);
  useEffect(() => {
    void bridge
      .getSettings()
      .then((s) => {
        setSettings(s);
        setLoaded(true);
      })
      .catch(() => {
        setError("Pengaturan tidak dapat dibaca.");
        setLoaded(true);
      });
    return () => session.current?.stop();
  }, []);
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        settings.theme === "system"
          ? query.matches
            ? "dark"
            : "light"
          : settings.theme);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [settings.theme]);
  useEffect(() => {
    if (!loaded || !settings.role) return;
    const s = new Classroom(settings, setState);
    session.current = s;
    if (settings.autoConnect && desktop && settings.role === "TEACHER")
      void s.start();
    else setState({ ...s.state, connection: "DISCONNECTED" });
    void bridge.getNetwork().then(setNetwork);
    return () => {
      s.stop();
    };
  }, [loaded, settings.role]);
  const save = async (next: Settings) => {
    const previous = settings;
    const saved = await bridge.saveSettings(next);
    setSettings(saved);
    if (session.current && saved.role === previous.role) {
      if (
        saved.port !== previous.port ||
        saved.teacherAddress !== previous.teacherAddress
      ) {
        session.current.stop();
        session.current.settings = saved;
        await session.current.start();
      } else if (
        ["cameraId", "microphoneId", "speakerId", "inputVolume"].some(
          (key) =>
            saved[key as keyof Settings] !== previous[key as keyof Settings],
        )
      )
        await session.current.replaceDevices(saved);
      else session.current.settings = saved;
    }
    setNetwork(await bridge.getNetwork());
  };
  const selectRole = async (role: Settings["role"]) => {
    try {
      await save({ ...settings, role, networkCode: "", sessionCode: "" });
    } catch {
      setError(
        "Peran tidak dapat dimulai. Port mungkin digunakan aplikasi lain.",
      );
    }
  };
  const connected = state?.connection === "CONNECTED";
  const goHome = async () => {
    session.current?.stop();
    setModal(false);
    if (document.fullscreenElement) await document.exitFullscreen();
    setPage("Kelas");
    setMic(true);
    setCamera(true);
    await selectRole(null);
  };
  const toggleVideoFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await videoStage.current?.requestFullscreen();
    } catch {
      setError(
        "Layar penuh tidak dapat dibuka. Coba kembali melalui tombol pada tayangan.",
      );
    }
  };
  const togglePresentation = async () => {
    setSharingBusy(true);
    try {
      if (state?.presenting) await session.current?.stopPresentation();
      else await session.current?.startPresentation();
    } catch {
      setError("Presentasi belum dapat diubah. Coba hubungkan ulang.");
    } finally {
      setSharingBusy(false);
    }
  };
  const changeVolume = (value: number) => {
    setSpeaker(true);
    setSettings((s) => ({ ...s, outputVolume: value }));
    if (session.current)
      session.current.settings = {
        ...session.current.settings,
        outputVolume: value,
      };
  };
  const persistVolume = () => {
    void bridge
      .saveSettings(settings)
      .catch(() =>
        setError(
          "Volume berubah, tetapi belum dapat disimpan. Coba simpan melalui Pengaturan.",
        ),
      );
  };
  const teacher = settings.role === "TEACHER";
  const permission = state?.permission ?? "MUTED";
  const connect = () => {
    if (!desktop) {
      setError("Buka aplikasi desktop untuk menghubungkan kedua ruang kelas.");
      return;
    }
    session.current?.stop();
    void session.current?.start();
    setMic(true);
    setCamera(true);
  };
  if (!loaded) return <div className="loading">Menyiapkan Mutasel…</div>;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={mutaselLogo} alt="Logo Mutasel" />
          <div>
            Mutasel<small>CLASSROOM CONNECTOR</small>
          </div>
        </div>
        <div className="topbar-right">
          {settings.role && (
            <button className="home-button" onClick={() => void goHome()}>
              <ArrowLeft size={17} />
              Kembali ke beranda
            </button>
          )}
          <span className="local-pill">
            <ShieldCheck size={15} /> Jaringan lokal saja
          </span>
          <span className="version">v{version}</span>
          <button
            className="icon-button"
            aria-label="Ganti tema"
            onClick={() => {
              void save({
                ...settings,
                theme:
                  document.documentElement.dataset.theme === "dark"
                    ? "light"
                    : "dark",
              });
            }}
          >
            {document.documentElement.dataset.theme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
        </div>
      </header>
      {!settings.role ? (
        <main className="onboarding">
          <span className="eyebrow">SELAMAT DATANG DI MUTASEL</span>
          <h1>
            Dua ruang.
            <br />
            <span>Satu pembelajaran.</span>
          </h1>
          <p>
            Hubungkan guru dan siswa dengan sederhana.
            <br />
            Tetap dekat, melalui jaringan sekolah Anda.
          </p>
          <div className="role-grid">
            <button
              className="role-card"
              onClick={() => void selectRole("TEACHER")}
            >
              <span className="role-art teacher-art">
                <BookOpen size={66} />
                <span className="art-dot" />
                <span className="art-line" />
              </span>
              <span className="role-content">
                <span className="eyebrow">PERANGKAT GURU</span>
                <strong>
                  Ruang guru <ArrowRight />
                </strong>
                <span>
                  Bagikan suara dan tayangan kelas.
                  <br />
                  Atur giliran siswa untuk berbicara.
                </span>
              </span>
            </button>
            <button
              className="role-card"
              onClick={() => void selectRole("STUDENT")}
            >
              <span className="role-art student-art">
                <GraduationCap size={74} />
                <span className="art-dot" />
                <span className="art-line" />
              </span>
              <span className="role-content">
                <span className="eyebrow">PERANGKAT SISWA</span>
                <strong>
                  Ruang siswa <ArrowRight />
                </strong>
                <span>
                  Ikuti pembelajaran dari ruang guru.
                  <br />
                  Minta izin ketika ingin berbicara.
                </span>
              </span>
            </button>
          </div>
          <div className="onboarding-trust">
            <span>
              <Wifi size={17} /> Tanpa internet
            </span>
            <span>
              <ShieldCheck size={17} /> Tanpa rekaman
            </span>
            <span>
              <Monitor size={17} /> Khusus dua ruang kelas
            </span>
          </div>
          {error && <p className="notice">{error}</p>}
          <small>
            Peran disimpan di perangkat ini dan dapat diubah melalui Pengaturan.
          </small>
        </main>
      ) : (
        <div className="shell">
          <aside className="sidebar">
            <div className="workspace-label">RUANG PEMBELAJARAN</div>
            <nav>
              {[
                { name: "Kelas", icon: Monitor },
                { name: "Diagnostik", icon: Activity },
                { name: "Panduan", icon: HelpCircle },
              ].map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  className={page === name ? "nav-active" : ""}
                  onClick={() => setPage(name)}
                >
                  <Icon size={19} />
                  {name}
                  {page === name && <span className="nav-dot" />}
                </button>
              ))}
              <button onClick={() => setModal(true)}>
                <Settings2 size={19} />
                Pengaturan
              </button>
            </nav>
            <div className="sidebar-bottom">
              <div className="privacy-card">
                <ShieldCheck size={22} />
                <strong>Privat. Lokal. Langsung.</strong>
                <p>
                  Pembelajaran tetap berjalan,
                  <br />
                  bahkan tanpa internet.
                </p>
              </div>
              <div className="device-identity">
                <span>
                  {teacher ? (
                    <BookOpen size={21} />
                  ) : (
                    <GraduationCap size={21} />
                  )}
                </span>
                <div>
                  <strong>{teacher ? "Ruang guru" : "Ruang siswa"}</strong>
                  <small>Perangkat {teacher ? "Teacher" : "Student"}</small>
                </div>
                <button
                  className="icon-button"
                  aria-label="Pengaturan perangkat"
                  onClick={() => setModal(true)}
                >
                  <Settings2 size={16} />
                </button>
              </div>
            </div>
          </aside>
          <main className="main-content">
            {page === "Kelas" && (
              <SessionConnection
                key={settings.role}
                teacher={teacher}
                network={network}
                settings={settings}
                onJoin={async (networkCode, sessionCode) => {
                  await save({ ...settings, networkCode, sessionCode });
                  setError("");
                  session.current?.stop();
                  await session.current?.start();
                }}
              />
            )}
            <div className="page-heading">
              <div>
                <div className="breadcrumb">
                  Ruang pembelajaran <ChevronRight size={13} /> {page}
                </div>
                <h1>
                  {page === "Kelas"
                    ? teacher
                      ? "Ruang guru"
                      : "Ruang siswa"
                    : page}
                </h1>
                <p>
                  {page === "Kelas"
                    ? "Siap mengajar, tetap terhubung."
                    : page === "Diagnostik"
                      ? "Informasi koneksi dan perangkat secara langsung."
                      : "Persiapan sederhana untuk pembelajaran yang lancar."}
                </p>
              </div>
              <span
                role="status"
                className={`status-pill ${connected ? "connected" : ""}`}
              >
                <span />
                {labels[state?.connection ?? "DISCONNECTED"]}
              </span>
            </div>
            {(error || state?.error) && (
              <div className="notice" role="alert">
                {error || state?.error}
                <button
                  onClick={() => {
                    setError("");
                    if (session.current) {
                      session.current.state.error = "";
                      setState({ ...session.current.state });
                    }
                  }}
                  aria-label="Tutup pemberitahuan"
                >
                  ×
                </button>
              </div>
            )}
            {page === "Kelas" ? (
              <>
                <div className="classroom-grid">
                  <section className="video-panel">
                    <div className="panel-heading">
                      <span>
                        <Video size={17} />
                        {teacher
                          ? "Pratinjau ruang guru"
                          : "Tayangan ruang guru"}
                      </span>
                      <span className="subtle-label">
                        {teacher ? "HANYA PRATINJAU" : "SIARAN KELAS"}
                      </span>
                    </div>
                    <div className="video-stage" ref={videoStage}>
                      <VideoPreview
                        stream={
                          teacher
                            ? (state?.local ?? null)
                            : (state?.remote ?? null)
                        }
                        local={teacher}
                        visible={
                          teacher
                            ? !!(camera || state?.presenting) &&
                              !!state?.local?.getVideoTracks().length
                            : connected &&
                              !!state?.remote?.getVideoTracks().length &&
                              state.peerCamera
                        }
                        speakerId={settings.speakerId}
                        volume={speaker ? settings.outputVolume : 0}
                      />
                      <span className="stage-label">
                        <span
                          className={connected ? "green-dot" : "gray-dot"}
                        />
                        {teacher
                          ? state?.presenting
                            ? "Presentasi layar komputer"
                            : "Kamera Anda"
                          : "Ruang guru"}
                      </span>
                      <button
                        className="stage-fullscreen"
                        aria-label={
                          videoFullscreen ? "Keluar layar penuh" : "Layar penuh"
                        }
                        title={
                          videoFullscreen
                            ? "Keluar layar penuh (Esc)"
                            : "Layar penuh"
                        }
                        onClick={() => void toggleVideoFullscreen()}
                      >
                        <Maximize size={18} />
                      </button>
                      {teacher && (
                        <div className="remote-audio">
                          <VideoPreview
                            stream={state?.remote ?? null}
                            local={false}
                            visible={true}
                            speakerId={settings.speakerId}
                            volume={speaker ? settings.outputVolume : 0}
                            allowed={permission === "APPROVED" && connected}
                          />
                        </div>
                      )}
                    </div>
                    <div className="video-caption">
                      <span>
                        <ShieldCheck size={14} /> Media langsung antarperangkat
                      </span>
                      <span>
                        {connected
                          ? "Kelas terhubung"
                          : "Menunggu koneksi kelas"}
                      </span>
                    </div>
                  </section>
                  <aside className="classroom-side">
                    <section className="panel connection-panel">
                      <div className="panel-heading">
                        <span>Koneksi kelas</span>
                        <Wifi size={18} />
                      </div>
                      <div className="endpoint">
                        <span className="endpoint-icon">
                          <BookOpen size={22} />
                        </span>
                        <div>
                          <strong>Ruang guru</strong>
                          <small>
                            {teacher
                              ? "Perangkat ini"
                              : connected
                                ? "Terhubung"
                                : "Menunggu koneksi"}
                          </small>
                        </div>
                        <span
                          className={
                            teacher || connected ? "green-dot" : "gray-dot"
                          }
                        />
                      </div>
                      <div className="connection-line">
                        <span />
                        <small>
                          {connected
                            ? "Terhubung melalui LAN"
                            : "Jaringan lokal"}
                        </small>
                      </div>
                      <div className="endpoint">
                        <span className="endpoint-icon">
                          <GraduationCap size={23} />
                        </span>
                        <div>
                          <strong>Ruang siswa</strong>
                          <small>
                            {!teacher
                              ? "Perangkat ini"
                              : connected
                                ? "Terhubung"
                                : "Belum terhubung"}
                          </small>
                        </div>
                        <span
                          className={
                            !teacher || connected ? "green-dot" : "gray-dot"
                          }
                        />
                      </div>
                      <div className="connection-bottom">
                        <ShieldCheck size={14} /> Tidak memerlukan internet
                      </div>
                    </section>
                    <section
                      className={`panel speak-panel ${permission === "REQUESTING" ? "requesting" : ""}`}
                    >
                      <div className="speak-icon">
                        <Hand size={24} />
                      </div>
                      <h3>
                        {permission === "REQUESTING"
                          ? teacher
                            ? "Siswa ingin berbicara"
                            : "Permintaan terkirim"
                          : permission === "APPROVED"
                            ? "Waktunya berbicara"
                            : "Giliran berbicara"}
                      </h3>
                      <p>
                        {permission === "REQUESTING"
                          ? teacher
                            ? "Ruang siswa meminta izin untuk menyalakan mikrofon."
                            : "Tunggu guru memberikan izin. Mikrofon Anda tetap nonaktif."
                          : permission === "APPROVED"
                            ? "Mikrofon siswa aktif. Suara dapat didengar di ruang guru."
                            : teacher
                              ? "Permintaan dari ruang siswa akan muncul di sini."
                              : "Ada yang ingin ditanyakan? Kirim permintaan kepada guru."}
                      </p>
                      {teacher ? (
                        permission === "REQUESTING" ? (
                          <div className="request-actions">
                            <button
                              className="primary"
                              onClick={() =>
                                session.current?.send({
                                  type: "SPEAK_APPROVED",
                                })
                              }
                            >
                              <Check size={16} />
                              Izinkan
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                session.current?.send({
                                  type: "SPEAK_REJECTED",
                                })
                              }
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <button
                            className="secondary full-width"
                            disabled={!connected}
                            onClick={() =>
                              session.current?.send({
                                type:
                                  permission === "APPROVED"
                                    ? "MUTE_STUDENT"
                                    : "SPEAK_APPROVED",
                              })
                            }
                          >
                            {permission === "APPROVED"
                              ? "Akhiri izin bicara"
                              : "Izinkan siswa berbicara"}
                          </button>
                        )
                      ) : (
                        <button
                          className="primary full-width"
                          disabled={!connected}
                          onClick={() =>
                            session.current?.send({
                              type:
                                permission === "APPROVED" ||
                                permission === "REQUESTING"
                                  ? "MUTE_STUDENT"
                                  : "REQUEST_TO_SPEAK",
                            })
                          }
                        >
                          <Mic size={17} />
                          {permission === "APPROVED"
                            ? "Selesai berbicara"
                            : permission === "REQUESTING"
                              ? "Batalkan permintaan"
                              : "Minta izin berbicara"}
                        </button>
                      )}
                      <span className="mic-state">
                        <MicOff size={13} />
                        {permissionLabels[permission]}
                      </span>
                    </section>
                  </aside>
                </div>
                <section className="controls-panel">
                  <div className="main-controls">
                    {teacher && (
                      <>
                        <button
                          disabled={!state?.local?.getAudioTracks().length}
                          className={!mic ? "control muted-control" : "control"}
                          onClick={() => {
                            session.current?.toggleMic();
                            setMic((s) => !s);
                          }}
                        >
                          {mic ? <Mic size={22} /> : <MicOff size={22} />}
                          <span>
                            Mikrofon
                            <small>
                              {!state?.local?.getAudioTracks().length
                                ? "Tidak tersedia"
                                : mic
                                  ? "Aktif"
                                  : "Nonaktif"}
                            </small>
                          </span>
                        </button>
                        <button
                          disabled={!state?.local?.getVideoTracks().length}
                          className={
                            !camera ? "control muted-control" : "control"
                          }
                          onClick={() => {
                            session.current?.toggleCamera();
                            setCamera((s) => !s);
                          }}
                        >
                          {camera ? (
                            <Video size={22} />
                          ) : (
                            <VideoOff size={22} />
                          )}
                          <span>
                            Kamera
                            <small>
                              {!state?.local?.getVideoTracks().length
                                ? "Tidak tersedia"
                                : camera
                                  ? "Aktif"
                                  : "Nonaktif"}
                            </small>
                          </span>
                        </button>
                      </>
                    )}
                    <div className="speaker-control">
                      <button
                        className="control"
                        onClick={() => setSpeaker((s) => !s)}
                      >
                        {speaker ? (
                          <Volume2 size={22} />
                        ) : (
                          <VolumeX size={22} />
                        )}
                        <span>
                          Speaker
                          <small>
                            {speaker ? `${settings.outputVolume}%` : "Nonaktif"}
                          </small>
                        </span>
                      </button>
                      <input
                        aria-label="Volume speaker"
                        type="range"
                        min="0"
                        max="100"
                        value={settings.outputVolume}
                        onChange={(e) => changeVolume(+e.target.value)}
                        onPointerUp={persistVolume}
                        onKeyUp={persistVolume}
                      />
                    </div>
                    <span className="control-divider" />
                    <button className="control" onClick={() => setModal(true)}>
                      <Settings2 size={21} />
                      <span>Perangkat</span>
                    </button>
                    {teacher && (
                      <button
                        className="control"
                        disabled={
                          sharingBusy ||
                          !state?.local ||
                          state?.connection === "DISCONNECTED"
                        }
                        onClick={() => void togglePresentation()}
                      >
                        <Monitor size={21} />
                        <span>
                          {sharingBusy
                            ? "Memilih layar…"
                            : state?.presenting
                              ? "Hentikan presentasi"
                              : "Mode presentasi"}
                        </span>
                      </button>
                    )}
                  </div>
                  {state?.ws === "open" ? (
                    <button
                      className="disconnect"
                      onClick={() => session.current?.stop()}
                    >
                      <PhoneOff size={18} />
                      Akhiri koneksi
                    </button>
                  ) : (
                    <button className="primary" onClick={connect}>
                      <Radio size={18} />
                      Hubungkan
                    </button>
                  )}
                </section>
                <div className="classroom-footnote">
                  <span>
                    <span className={connected ? "green-dot" : "gray-dot"} />{" "}
                    Guru:{" "}
                    {teacher
                      ? mic && !!state?.local?.getAudioTracks().length
                        ? "mikrofon aktif"
                        : "mikrofon nonaktif"
                      : state?.peerMic
                        ? "mikrofon aktif"
                        : "mikrofon nonaktif"}{" "}
                    <span className="footnote-divider">/</span> Siswa:{" "}
                    {permission === "APPROVED"
                      ? "mikrofon aktif"
                      : "mikrofon nonaktif"}
                  </span>
                  <button onClick={() => setPage("Panduan")}>
                    Butuh bantuan? <ArrowRight size={14} />
                  </button>
                </div>
              </>
            ) : page === "Diagnostik" ? (
              <div className="diagnostics">
                <section className="panel">
                  <h2>Status perangkat</h2>
                  {Object.entries({
                    Peran: settings.role,
                    Jaringan:
                      network?.addresses
                        .map((a) => `${a.name} · ${a.address}`)
                        .join(", ") || "Tidak ada alamat LAN",
                    Server: network?.serverRunning ? "Aktif" : "Tidak aktif",
                    Alamat: state?.address || "Belum ditemukan",
                    WebSocket: state?.ws ?? "closed",
                    WebRTC: state?.rtc ?? "closed",
                    Mikrofon: state?.local?.getAudioTracks().length
                      ? "Tersedia"
                      : "Tidak tersedia",
                    Kamera: state?.local?.getVideoTracks().length
                      ? "Tersedia"
                      : "Tidak digunakan",
                    Internet:
                      "Tidak diperlukan; tidak menghubungi layanan internet",
                    ...state?.stats,
                  }).map(([key, value]) => (
                    <div className="diagnostic-row" key={key}>
                      <span>{key}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                  <button className="secondary" onClick={connect}>
                    Tes koneksi ulang
                  </button>
                </section>
                <section className="panel">
                  <h2>Aktivitas sesi</h2>
                  <p className="muted">
                    Hanya disimpan di memori, maksimal 60 kejadian.
                  </p>
                  <div className="logs">
                    {state?.logs.length
                      ? state.logs.map((log, i) => <div key={i}>{log}</div>)
                      : "Belum ada aktivitas koneksi."}
                  </div>
                </section>
              </div>
            ) : (
              <section className="panel guide">
                <span className="eyebrow">PERSIAPAN KELAS</span>
                <h2>Mulai pembelajaran dalam tiga langkah.</h2>
                {[
                  "Hubungkan kedua komputer ke LAN atau Wi-Fi yang sama. Ethernet disarankan untuk koneksi stabil.",
                  "Pilih Ruang guru pada komputer pengajar dan Ruang siswa pada komputer kelas penerima.",
                  "Periksa kamera, mikrofon, dan speaker. Tekan Hubungkan; siswa meminta izin sebelum berbicara.",
                ].map((text, i) => (
                  <div className="guide-step" key={text}>
                    <span>{i + 1}</span>
                    <p>{text}</p>
                  </div>
                ))}
                <h3>Koneksi belum berhasil?</h3>
                <p>
                  Pastikan aplikasi guru aktif. Nonaktifkan isolasi klien Wi-Fi
                  dan periksa VLAN bersama pengelola jaringan. Izinkan aplikasi
                  pada Windows Firewall untuk jaringan Private, termasuk media
                  UDP. Salin kode jaringan dan kode unik terbaru dari ruang
                  guru, lalu gunakan Sambungkan dengan kode pada halaman Kelas.
                </p>
                <h3>Suara bergema atau tidak terdengar?</h3>
                <p>
                  Jauhkan mikrofon dari speaker, gunakan mikrofon directional
                  bila tersedia, lalu periksa volume dan perangkat keluaran.
                  Bluetooth dapat menambah keterlambatan. Tidak ada suara yang
                  direkam.
                </p>
                <button className="secondary" onClick={() => setModal(true)}>
                  Buka pengaturan <ArrowRight size={16} />
                </button>
              </section>
            )}
          </main>
        </div>
      )}
      {modal && (
        <SettingsPanel
          settings={settings}
          level={level}
          onSave={save}
          onClose={() => setModal(false)}
          onRole={() => void goHome()}
        />
      )}
    </div>
  );
}
