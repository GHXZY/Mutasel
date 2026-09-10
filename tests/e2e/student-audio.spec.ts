import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { networkCode } from "../../packages/shared/protocol";

test("student microphone reaches teacher playback after approval and repeated revocation", async () => {
  test.setTimeout(90000);
  const folder = path.join(process.cwd(), ".test-data", `audio-${Date.now()}`);
  await mkdir(folder, { recursive: true });
  // A deterministic microphone signal, without accessing the user's microphone.
  const rate = 48000,
    samples = rate * 4;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    wav.writeInt16LE(
      Math.round(10000 * Math.sin((2 * Math.PI * 440 * i) / rate)),
      44 + i * 2,
    );
  const signal = path.join(folder, "microphone.wav");
  await writeFile(signal, wav);
  const apps: ElectronApplication[] = [];
  const launch = async (name: string) => {
    const profile = path.join(folder, name);
    await mkdir(profile, { recursive: true });
    await writeFile(
      path.join(profile, "settings.json"),
      JSON.stringify({ port: 48912, theme: "light" }),
    );
    const app = await electron.launch({
      args: [
        ".",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${signal}`,
      ],
      env: { ...process.env, CLASSROOM_TEST_DATA: profile },
    });
    apps.push(app);
    const page = await app.firstWindow();
    // Speech processing intentionally removes a steady test tone. Disable it
    // only in this synthetic transport test so received energy is measurable.
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = (constraints) =>
        original({
          ...constraints,
          audio: constraints?.audio
            ? {
                ...(typeof constraints.audio === "object"
                  ? constraints.audio
                  : {}),
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              }
            : false,
        });
    });
    await page.reload();
    return page;
  };
  try {
    const teacher = await launch("teacher");
    const student = await launch("student");
    await teacher.getByRole("button", { name: /PERANGKAT GURU/ }).click();
    await student.getByRole("button", { name: /PERANGKAT SISWA/ }).click();
    const info = await teacher.evaluate(() => window.classroom!.getNetwork());
    await student
      .getByLabel("Kode jaringan", { exact: true })
      .fill(networkCode("127.0.0.1", info.port));
    await student
      .getByLabel("Kode unik sesi", { exact: true })
      .fill(info.sessionCode!);
    await student
      .getByRole("button", { name: "Sambungkan dengan kode" })
      .click();
    await expect(teacher.locator(".status-pill")).toHaveText("Terhubung", {
      timeout: 25000,
    });
    const playback = teacher.locator(".remote-audio video");
    for (let cycle = 0; cycle < 3; cycle++) {
      if (cycle === 2) {
        await student
          .getByRole("button", { name: "Akhiri koneksi", exact: true })
          .click();
        await expect(teacher.locator(".status-pill")).toHaveText(
          "Menunggu ruang kelas",
        );
        await student
          .getByRole("button", { name: "Hubungkan", exact: true })
          .click();
        await expect(teacher.locator(".status-pill")).toHaveText("Terhubung", {
          timeout: 25000,
        });
      }
      await expect
        .poll(() => playback.evaluate((v: HTMLMediaElement) => v.muted))
        .toBe(true);
      await student
        .getByRole("button", { name: "Minta izin berbicara" })
        .click();
      await teacher
        .getByRole("button", { name: "Izinkan", exact: true })
        .click();
      await expect
        .poll(() =>
          playback.evaluate((v: HTMLMediaElement) => ({
            paused: v.paused,
            muted: v.muted,
            live: (v.srcObject as MediaStream)?.getAudioTracks()[0]?.readyState,
          })),
        )
        .toEqual({ paused: false, muted: false, live: "live" });
      const energy = await playback.evaluate(async (v: HTMLMediaElement) => {
        const context = new AudioContext();
        await context.resume();
        const source = context.createMediaStreamSource(
          v.srcObject as MediaStream,
        );
        const analyser = context.createAnalyser();
        source.connect(analyser);
        const data = new Float32Array(analyser.fftSize);
        let peak = 0;
        for (let i = 0; i < 30; i++) {
          analyser.getFloatTimeDomainData(data);
          peak = Math.max(peak, ...data.map(Math.abs));
          await new Promise((r) => setTimeout(r, 100));
        }
        source.disconnect();
        await context.close();
        return peak;
      });
      expect(energy).toBeGreaterThan(0.001);
      const time = await playback.evaluate(
        (v: HTMLMediaElement) => v.currentTime,
      );
      await expect
        .poll(() => playback.evaluate((v: HTMLMediaElement) => v.currentTime))
        .toBeGreaterThan(time);
      await teacher.getByRole("button", { name: "Akhiri izin bicara" }).click();
    }
    await expect
      .poll(() => playback.evaluate((v: HTMLMediaElement) => v.muted))
      .toBe(true);
  } finally {
    for (const app of apps.reverse()) await app.close();
  }
});
