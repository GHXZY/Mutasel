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
