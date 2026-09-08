import { useState } from "react";
import {
  networkCode,
  parseNetworkCode,
  type NetworkInfo,
  type Settings,
} from "../../../../packages/shared/protocol";

export function SessionConnection({
  teacher,
  network,
  settings,
  onJoin,
}: {
  teacher: boolean;
  network?: NetworkInfo;
  settings: Settings;
  onJoin: (networkCode: string, sessionCode: string) => Promise<void>;
}) {
  const [target, setTarget] = useState(settings.networkCode);
  const [code, setCode] = useState(settings.sessionCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (teacher)
    return (
      <section className="session-connection" aria-label="Kode sesi guru">
        <div>
          <strong>Sambungkan ruang kelas</strong>
          <p>
            Bagikan kedua kode ini kepada ruang kelas tujuan. Kode unik berganti
            saat kembali ke beranda lalu membuka ruang guru, atau aplikasi guru
            dibuka ulang.
          </p>
        </div>
        <label>
          Kode unik sesi
          <code data-testid="session-code">
            {network?.sessionCode ?? "Menyiapkan…"}
          </code>
        </label>
        <div className="network-codes">
          <strong>Kode jaringan</strong>
          {network?.addresses.map((item) => (
            <div key={item.address}>
              <code>{networkCode(item.address, network.port)}</code>
              <small>
                {item.name} · {item.address}
              </small>
            </div>
          ))}
          {!network?.addresses.length && (
            <small>Hubungkan komputer guru ke LAN atau Wi-Fi.</small>
          )}
        </div>
        <small>
          Jika ada beberapa kode jaringan, gunakan jaringan yang juga dipakai
          ruang kelas. Satu sesi menghubungkan satu ruang guru dan satu ruang
          kelas.
        </small>
      </section>
    );
  return (
    <form
      className="session-connection"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        if (!parseNetworkCode(target) || !/^[A-F0-9]{12}$/.test(code)) {
          setError(
            "Salin kode jaringan dan 12 karakter kode unik persis seperti di ruang guru.",
          );
          return;
        }
        setBusy(true);
        try {
          await onJoin(target, code);
        } catch {
          setError(
            "Belum dapat menyambung. Periksa kode dan jaringan lalu coba lagi.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <strong>Sambung dengan kode</strong>
        <p>Minta kedua kode yang sedang tampil di ruang guru tujuan.</p>
      </div>
      <label>
        Kode jaringan
        <input
          required
          maxLength={16}
          placeholder="MS-C0A8010A-B284"
          autoComplete="off"
          spellCheck={false}
          value={target}
          onChange={(event) =>
            setTarget(event.target.value.trim().toUpperCase())
          }
        />
      </label>
      <label>
        Kode unik sesi
        <input
          required
          maxLength={12}
          placeholder="12 karakter dari ruang guru"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value.trim().toUpperCase())}
        />
      </label>
      <button className="primary" disabled={busy} type="submit">
        {busy ? "Menyambungkan…" : "Sambungkan dengan kode"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
