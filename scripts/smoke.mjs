import { _electron as electron } from "@playwright/test";
const app = await electron.launch({
  args: ["."],
  env: {
    ...process.env,
    CLASSROOM_TEST_DATA: process.cwd() + "/.test-data/smoke",
  },
});
try {
  const page = await app.firstWindow();
  await page.waitForSelector("h1");
  console.log(await page.title());
  console.log(await page.evaluate(() => window.classroom.getAppInfo()));
} finally {
  await app.close();
}
