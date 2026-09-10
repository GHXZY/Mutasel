import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
async function joinWithCode(teacher: Page, student: Page) {
  const info = await teacher.evaluate(() => window.classroom!.getNetwork());
  const { networkCode } = await import("../../packages/shared/protocol");
  await student
    .getByLabel("Kode jaringan", { exact: true })
    .fill(networkCode("127.0.0.1", info.port));
  await student
    .getByLabel("Kode unik sesi", { exact: true })
    .fill(info.sessionCode!);
  await student
    .getByRole("button", { name: "Sambungkan dengan kode", exact: true })
    .click();
}
async function launch(name: string) {
  const dir = path.join(root, ".test-data", `${name}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "settings.json"),
    JSON.stringify({ theme: "light", port: 48910 }),
  );
  const application = await electron.launch({
    args: [
      ".",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
    env: { ...process.env, CLASSROOM_TEST_DATA: dir },
  });
  await (await application.firstWindow()).waitForLoadState("load");
  return application;
}
test("roles, real P2P media, speaking permission, rejection, reconnect and settings", async () => {
  test.setTimeout(180000);
  let teacher: ElectronApplication | undefined,
    student: ElectronApplication | undefined;
  try {
    teacher = await launch("teacher");
    const t = await teacher.firstWindow();
    const errors: string[] = [];
    t.on("console", (m) => {
      if (m.type() === "error") console.log("TEACHER:", m.text());
    });
    t.on("pageerror", (e) => errors.push(e.message));
    await expect(
      t.getByRole("heading", { name: "Dua ruang. Satu pembelajaran." }),
    ).toBeVisible();
    await t.getByRole("button", { name: /PERANGKAT GURU/ }).click();
    await expect(
      t.getByRole("heading", { name: "Ruang guru", exact: true }),
    ).toBeVisible();
    student = await launch("student");
    const s = await student.firstWindow();
    s.on("console", (m) => {
      if (m.type() === "error") console.log("STUDENT:", m.text());
    });
    s.on("pageerror", (e) => errors.push(e.message));
    await s.evaluate(async () => {
      const settings = await window.classroom!.getSettings();
      await window.classroom!.saveSettings({
        ...settings,
        teacherAddress: "127.0.0.1",
      });
    });
    await s.reload();
    await s.getByRole("button", { name: /PERANGKAT SISWA/ }).click();
    await expect(s.locator(".status-pill")).toHaveText("Tidak terhubung");
    await s
      .getByLabel("Kode jaringan", { exact: true })
      .fill("MS-7F000001-BF0E");
    await s.getByLabel("Kode unik sesi", { exact: true }).fill("000000000000");
    await s
      .getByRole("button", { name: "Sambungkan dengan kode", exact: true })
      .click();
    await expect(s.getByRole("alert")).toContainText(
      "Kode unik atau kode jaringan tidak cocok",
    );
    await joinWithCode(t, s);
    await expect(t.locator(".status-pill")).toHaveText("Terhubung", {
      timeout: 25000,
    });
    await expect(s.locator(".status-pill")).toHaveText("Terhubung");
    const discovered = await s.evaluate(() => window.classroom!.discover());
    expect(discovered.some((d) => d.port === 48910)).toBe(true);
    await expect
      .poll(() =>
        s
          .locator(".video-stage > video")
          .evaluate(
            (v: HTMLVideoElement) =>
              (v.srcObject as MediaStream)?.getAudioTracks().length,
          ),
      )
      .toBe(1);
    await expect
      .poll(() =>
        s
          .locator(".video-stage > video")
          .evaluate((video: HTMLVideoElement) => video.videoWidth),
      )
      .toBeGreaterThan(0);
    await expect(s.locator(".mic-state")).toContainText("nonaktif");
    await t.getByRole("button", { name: "Layar penuh", exact: true }).click();
    await expect
      .poll(() => t.evaluate(() => document.fullscreenElement?.className))
      .toBe("video-stage");
    await t
      .getByRole("button", { name: "Keluar layar penuh", exact: true })
      .click();
    await expect
      .poll(() => t.evaluate(() => !!document.fullscreenElement))
      .toBe(false);
    await s.getByRole("button", { name: "Layar penuh", exact: true }).click();
    await expect
      .poll(() => s.evaluate(() => document.fullscreenElement?.className))
      .toBe("video-stage");
    await s
      .getByRole("button", { name: "Keluar layar penuh", exact: true })
      .click();
    const volume = s.getByRole("slider", {
      name: "Volume speaker",
      exact: true,
    });
    await volume.focus();
    await volume.press("Home");
    await expect
      .poll(() =>
        s
          .locator(".video-stage > video")
          .evaluate((v: HTMLVideoElement) => v.volume),
      )
      .toBe(0);
    await volume.press("ArrowRight");
    await expect
      .poll(() =>
        s
          .locator(".video-stage > video")
          .evaluate((v: HTMLVideoElement) => v.volume),
      )
      .toBe(0.01);
    await volume.press("End");
    await expect
      .poll(() =>
        s.evaluate(
          async () => (await window.classroom!.getSettings()).outputVolume,
        ),
      )
      .toBe(100);
    // Exercise the production picker and capture pipeline, selecting only this test app window.
    await teacher.evaluate(
      async ({ desktopCapturer, dialog, BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0].setTitle("Mutasel Presentation Test");
        const getSources = desktopCapturer.getSources.bind(desktopCapturer);
        desktopCapturer.getSources = async () => {
          const sources = await getSources({
            types: ["window"],
            thumbnailSize: { width: 0, height: 0 },
          });
          return sources.filter((s) => s.name === "Mutasel Presentation Test");
        };
        dialog.showMessageBox = (async () => ({
          response: 1,
          checkboxChecked: false,
        })) as typeof dialog.showMessageBox;
      },
    );
    for (let cycle = 0; cycle < 3; cycle++) {
      await t
        .getByRole("button", { name: "Mode presentasi", exact: true })
        .click();
      await expect(
        t.getByRole("button", { name: "Hentikan presentasi", exact: true }),
      ).toBeVisible({ timeout: 10000 });
      await expect(t.locator(".stage-label")).toContainText(
        "Presentasi layar komputer",
      );
      await expect(s.locator(".status-pill")).toHaveText("Terhubung");
      const before = await s
        .locator(".video-stage > video")
        .evaluate(
          (v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames,
        );
      await expect
        .poll(() =>
          s
            .locator(".video-stage > video")
            .evaluate(
              (v: HTMLVideoElement) =>
                v.getVideoPlaybackQuality().totalVideoFrames,
            ),
        )
        .toBeGreaterThan(before + 2);
      await t
        .getByRole("button", { name: "Hentikan presentasi", exact: true })
        .click();
      await expect(t.locator(".stage-label")).toContainText("Kamera Anda");
    }
    await s.getByRole("button", { name: "Minta izin berbicara" }).click();
    await expect(
      t.getByRole("heading", { name: "Siswa ingin berbicara" }),
    ).toBeVisible();
    await t.getByRole("button", { name: "Izinkan", exact: true }).click();
    await expect(s.locator(".mic-state")).toContainText("boleh berbicara");
    await expect
      .poll(() =>
        t
          .locator(".remote-audio video")
          .evaluate((v: HTMLVideoElement) => v.muted),
      )
      .toBe(false);
    await t.getByRole("button", { name: "Akhiri izin bicara" }).click();
    await expect(s.locator(".mic-state")).toContainText("nonaktif");
    await expect
      .poll(() =>
        t
          .locator(".remote-audio video")
          .evaluate((v: HTMLVideoElement) => v.muted),
      )
      .toBe(true);
    await s.getByRole("button", { name: "Minta izin berbicara" }).click();
    await t.getByRole("button", { name: "Tolak", exact: true }).click();
    await expect(s.locator(".mic-state")).toContainText("belum disetujui");
    await s.getByRole("button", { name: "Akhiri koneksi" }).click();
    await expect(t.locator(".status-pill")).toHaveText("Menunggu ruang kelas");
    await s.getByRole("button", { name: "Hubungkan", exact: true }).click();
    await expect(s.locator(".status-pill")).toHaveText("Terhubung", {
      timeout: 25000,
    });
    await t.getByRole("button", { name: "Pengaturan", exact: true }).click();
    await expect(t.getByRole("dialog")).toBeVisible();
    await t.getByRole("button", { name: "Umum", exact: true }).click();
    await t.getByLabel(/Tampilan/).selectOption("dark");
    await t.getByRole("button", { name: "Simpan pengaturan" }).click();
    await expect(t.locator("html")).toHaveAttribute("data-theme", "dark");
    await t.getByRole("button", { name: "Diagnostik", exact: true }).click();
    await expect(
      t.getByRole("heading", { name: "Status perangkat" }),
    ).toBeVisible();
    const savedProfile = await teacher.evaluate(({ app }) =>
      app.getPath("userData"),
    );
    await teacher.close();
    teacher = undefined;
    await expect(s.locator(".status-pill")).not.toHaveText("Terhubung");
    teacher = await electron.launch({
      args: [
        ".",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
      env: { ...process.env, CLASSROOM_TEST_DATA: savedProfile },
    });
    const restarted = await teacher.firstWindow();
    await expect(
      restarted.getByRole("heading", { name: "Ruang guru", exact: true }),
    ).toBeVisible();
    await expect(restarted.locator("html")).toHaveAttribute(
      "data-theme",
      "dark",
    );
    await expect(s.getByRole("alert")).toContainText(
      "Kode unik atau kode jaringan tidak cocok",
      { timeout: 25000 },
    );
    await joinWithCode(restarted, s);
    await expect(s.locator(".status-pill")).toHaveText("Terhubung", {
      timeout: 25000,
    });
    await expect(s.locator(".mic-state")).toContainText("nonaktif");
    const playback = await s.evaluate(async () => {
      const video = document.querySelector<HTMLVideoElement>(
        ".video-stage > video",
      )!;
      const samples = [];
      for (let i = 0; i < 13; i++) {
        const quality = video.getVideoPlaybackQuality();
        samples.push({
          time: performance.now(),
          frames: quality.totalVideoFrames,
          dropped: quality.droppedVideoFrames,
          status: document.querySelector(".status-pill")?.textContent,
          tracks: (video.srcObject as MediaStream | null)
            ?.getTracks()
            .map((t) => ({ id: t.id, state: t.readyState, muted: t.muted })),
          paused: video.paused,
        });
        if (i < 12) await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      return samples;
    });
    console.log("PLAYBACK", JSON.stringify(playback));
    for (let i = 1; i < playback.length; i++)
      expect(playback[i].frames).toBeGreaterThan(playback[i - 1].frames);
    const first = playback[0],
      last = playback.at(-1)!;
    const smoothness = {
      durationSeconds: (last.time - first.time) / 1000,
      decodedFrames: last.frames - first.frames,
      droppedFrames: last.dropped - first.dropped,
      averageFps:
        (last.frames - first.frames) / ((last.time - first.time) / 1000),
    };
    console.log("SMOOTHNESS", JSON.stringify(smoothness));
    await writeFile(
      path.join(root, "test-results", "smoothness.json"),
      JSON.stringify(smoothness, null, 2),
    );
    await s.getByRole("button", { name: "Kembali ke beranda" }).click();
    await expect(s.locator(".role-grid")).toBeVisible();
    await restarted.getByRole("button", { name: "Kembali ke beranda" }).click();
    await expect(restarted.locator(".role-grid")).toBeVisible();
    await expect
      .poll(() =>
        restarted.evaluate(
          async () => (await window.classroom!.getNetwork()).serverRunning,
        ),
      )
      .toBe(false);
    await s.getByRole("button", { name: /PERANGKAT GURU/ }).click();
    await restarted.getByRole("button", { name: /PERANGKAT SISWA/ }).click();
    await expect(
      s.getByRole("heading", { name: "Ruang guru", exact: true }),
    ).toBeVisible();
    await expect(
      restarted.getByRole("heading", { name: "Ruang siswa", exact: true }),
    ).toBeVisible();
    await joinWithCode(s, restarted);
    await expect(restarted.locator(".status-pill")).toHaveText("Terhubung", {
      timeout: 25000,
    });
    expect(errors).toEqual([]);
  } finally {
    await student?.close();
    await teacher?.close();
  }
});
