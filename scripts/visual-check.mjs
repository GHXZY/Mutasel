import { _electron as electron } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const data = process.cwd() + "/.test-data/visual-" + Date.now();
await mkdir(data, { recursive: true });
await writeFile(
  data + "/settings.json",
  JSON.stringify({ theme: "light", autoConnect: false }),
);
const app = await electron.launch({
  args: ["."],
  env: { ...process.env, CLASSROOM_TEST_DATA: data },
});
try {
  const page = await app.firstWindow();
  await page.waitForSelector(".role-grid");
  await mkdir("docs/previews", { recursive: true });
  await page.screenshot({ path: "docs/previews/welcome.png" });
  await page.getByRole("button", { name: /PERANGKAT GURU/ }).click();
  await page.waitForSelector(".video-panel");
  await page.screenshot({ path: "docs/previews/teacher.png" });
  for (const [width, height] of [
    [1280, 720],
    [1366, 768],
    [1920, 1080],
  ]) {
    await app.evaluate(
      ({ BrowserWindow }, { width, height }) =>
        BrowserWindow.getAllWindows()[0].setSize(width, height),
      { width, height },
    );
    console.log(
      `${width}x${height}`,
      await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        controls: !!document.querySelector(".controls-panel"),
      })),
    );
  }
} finally {
  await app.close();
}
