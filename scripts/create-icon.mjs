import { _electron as electron } from "@playwright/test";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
const svg = await readFile("Logo Mutasel.svg", "utf8");
await mkdir("build", { recursive: true });
await mkdir("apps/desktop/renderer/assets", { recursive: true });
await copyFile("Logo Mutasel.svg", "apps/desktop/renderer/assets/mutasel.svg");
const app = await electron.launch({
  args: ["."],
  env: {
    ...process.env,
    CLASSROOM_TEST_DATA: process.cwd() + "/.test-data/icon-" + Date.now(),
  },
});
try {
  const page = await app.firstWindow();
  await page.waitForSelector(".role-grid");
  await page.setContent(
    `<html><style>html,body{margin:0;background:transparent}svg{display:block;width:256px;height:256px}</style>${svg}</html>`,
  );
  const png = await page.locator("svg").screenshot({ omitBackground: true });
  const images = await app.evaluate(({ nativeImage }, source) => {
    const capture = nativeImage.createFromBuffer(Buffer.from(source, "base64"));
    const result = [16, 24, 32, 48, 64, 128, 256].map((size) => ({
      size,
      png: capture
        .resize({ width: size, height: size, quality: "best" })
        .toPNG()
        .toString("base64"),
    }));
    return result;
  }, png.toString("base64"));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  const buffers = [];
  images.forEach(({ size, png }, index) => {
    const data = Buffer.from(png, "base64");
    const entry = 6 + 16 * index;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
    buffers.push(data);
  });
  await writeFile("build/icon.ico", Buffer.concat([header, ...buffers]));
  await writeFile("build/icon.png", Buffer.from(images.at(-1).png, "base64"));
  console.log("Logo SVG rendered to PNG and Windows ICO (16–256 px).");
} finally {
  await app.close();
}
