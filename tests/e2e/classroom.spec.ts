import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
async function launch(name: string) {
  const dir = path.join(root, ".test-data", `${name}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "settings.json"),
    JSON.stringify({ theme: "light", port: 48910 }),
  );
  return electron.launch({
    args: [
      ".",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
    env: { ...process.env, CLASSROOM_TEST_DATA: dir },
  });
}
test("roles, real P2P media, speaking permission, rejection, reconnect and settings", async () => {
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
    await expect(s.locator(".status-pill")).toHaveText("Terhubung", {
      timeout: 25000,
    });
    await expect(s.locator(".mic-state")).toContainText("nonaktif");
    expect(errors).toEqual([]);
  } finally {
    await student?.close();
    await teacher?.close();
  }
});
