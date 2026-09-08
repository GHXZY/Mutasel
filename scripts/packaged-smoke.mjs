import { _electron as electron, expect } from "@playwright/test";
const app = await electron.launch({
  executablePath:
    process.cwd() + "/release/win-unpacked/Mutasel Classroom Connector.exe",
  env: {
    ...process.env,
    CLASSROOM_TEST_DATA: process.cwd() + "/.test-data/packaged-" + Date.now(),
  },
});
try {
  const page = await app.firstWindow();
  await expect(page.locator(".role-grid")).toBeVisible();
  await expect(page).toHaveTitle("Mutasel: Classroom Connector");
  await expect(page.getByRole("img", { name: "Logo Mutasel" })).toBeVisible();
  await page.evaluate(async () => {
    const settings = await window.classroom.getSettings();
    await window.classroom.saveSettings({ ...settings, autoConnect: false });
  });
  await page.reload();
  await page.getByRole("button", { name: /PERANGKAT GURU/ }).click();
  await expect(page.getByTestId("session-code")).toHaveText(/^[A-F0-9]{12}$/);
  const firstCode = await page.getByTestId("session-code").textContent();
  await page.getByRole("button", { name: "Kembali ke beranda" }).click();
  await page.getByRole("button", { name: /PERANGKAT GURU/ }).click();
  await expect(page.getByTestId("session-code")).toHaveText(/^[A-F0-9]{12}$/);
  expect(await page.getByTestId("session-code").textContent()).not.toBe(firstCode);
  await page.getByRole("button", { name: "Kembali ke beranda" }).click();
  await page.getByRole("button", { name: /PERANGKAT SISWA/ }).click();
  await expect(page.getByLabel("Kode jaringan", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Kode unik sesi", { exact: true })).toHaveValue("");
  await page.screenshot({ path: "docs/previews/student-pairing.png" });
  console.log("Session codes: teacher regeneration and student manual form passed");
  console.log(
    "Packaged EXE:",
    await page.evaluate(() => window.classroom.getAppInfo()),
  );
  console.log(
    "Product:",
    await app.evaluate(({ app }) => ({
      name: app.getName(),
      userData: app.getPath("userData"),
    })),
  );
  console.log(
    "Security:",
    await app.evaluate(({ BrowserWindow }) => {
      const p =
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return {
        nodeIntegration: p.nodeIntegration,
        contextIsolation: p.contextIsolation,
        sandbox: p.sandbox,
      };
    }),
  );
} finally {
  await app.close();
}
