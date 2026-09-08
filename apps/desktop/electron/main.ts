import { app, BrowserWindow, ipcMain, session } from "electron";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import {
  defaults,
  settingsSchema,
  privateHost,
  type Settings,
} from "../../../packages/shared/protocol";
import { startServer } from "../../../packages/signaling/server";
import {
  advertise,
  addresses,
  discover,
} from "../../../packages/signaling/discovery";
let win: BrowserWindow | null = null;
let settings: Settings = defaults;
let server: Awaited<ReturnType<typeof startServer>> | undefined;
let stopDiscovery: (() => void) | undefined;
const teacherToken = randomBytes(32).toString("hex");
let quitting = false;
const devUrl = process.env.VITE_DEV_SERVER_URL;
// Keep the existing settings location across the product rename; ':' is not valid in Windows paths.
app.setPath("userData", path.join(app.getPath("appData"), "local-classroom"));
app.setName("Mutasel: Classroom Connector");
app.setAppUserModelId("id.localclassroom.desktop");
if (process.env.CLASSROOM_TEST_DATA)
  app.setPath("userData", process.env.CLASSROOM_TEST_DATA);
const settingsPath = () => path.join(app.getPath("userData"), "settings.json");
async function stop() {
  stopDiscovery?.();
  stopDiscovery = undefined;
  await server?.close();
  server = undefined;
}
async function apply(next: Settings) {
  if (
    next.role !== settings.role ||
    next.port !== settings.port ||
    (next.role === "TEACHER" && !server)
  ) {
    await stop();
    if (next.role === "TEACHER") {
      server = await startServer(next.port, teacherToken);
      stopDiscovery = advertise(next.port);
    }
  }
  settings = next;
}
function trusted(url: string) {
  return devUrl
    ? url.startsWith(devUrl + "/")
    : url ===
        new URL(
          `file:///${path.join(__dirname, "../dist/index.html").replaceAll("\\", "/")}`,
        ).href;
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (win?.isMinimized()) win.restore();
    win?.focus();
  });
  app.whenReady().then(async () => {
    let saved = defaults;
    try {
      saved = settingsSchema.parse(
        JSON.parse(await readFile(settingsPath(), "utf8")),
      );
    } catch {}
    try {
      await apply(saved);
    } catch {
      settings = saved;
    }
    session.defaultSession.setPermissionRequestHandler(
      (contents, permission, callback) =>
        callback(
          contents === win?.webContents &&
            trusted(contents.getURL()) &&
            ["media", "speaker-selection"].includes(permission),
        ),
    );
    session.defaultSession.setPermissionCheckHandler(
      (contents, permission) =>
        contents === win?.webContents &&
        trusted(contents.getURL()) &&
        ["media", "speaker-selection"].includes(permission),
    );
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
      (details, callback) => {
        const url = new URL(details.url);
        callback({
          cancel: !(
            (url.protocol === "ws:" && privateHost(url.hostname)) ||
            (!!devUrl && url.origin === devUrl)
          ),
        });
      },
    );
    const handle = (channel: string, fn: (arg: unknown) => unknown) =>
      ipcMain.handle(channel, (event, arg: unknown) => {
        if (
          event.sender !== win?.webContents ||
          !trusted(event.senderFrame?.url ?? "")
        )
          throw new Error("Unauthorized IPC");
        return fn(arg);
      });
    handle("settings:get", () => settings);
    handle("settings:save", async (value) => {
      const next = settingsSchema.parse(value);
      await apply(next);
      await mkdir(app.getPath("userData"), { recursive: true });
      await writeFile(settingsPath() + ".tmp", JSON.stringify(next, null, 2));
      await rename(settingsPath() + ".tmp", settingsPath());
      if (app.isPackaged)
        app.setLoginItemSettings({ openAtLogin: next.autoStart });
      return settings;
    });
    handle("network:get", () => ({
      addresses: addresses(),
      serverRunning: !!server,
      port: settings.port,
    }));
    handle("network:discover", () => discover());
    handle("teacher:token", () =>
      settings.role === "TEACHER" ? teacherToken : "",
    );
    handle("window:fullscreen", () => win?.setFullScreen(!win.isFullScreen()));
    handle("app:info", () => ({ version: app.getVersion(), build: "1" }));
    win = new BrowserWindow({
      width: 1366,
      height: 850,
      minWidth: 900,
      minHeight: 640,
      title: "Mutasel: Classroom Connector",
      icon: path.join(__dirname, "icon.png"),
      backgroundColor: "#F7F9F5",
      autoHideMenuBar: true,
      fullscreen: settings.fullscreen,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event, url) => {
      if (!trusted(url)) event.preventDefault();
    });
    win.webContents.on("before-input-event", (event, input) => {
      if (input.key === "F11" && input.type === "keyDown") {
        event.preventDefault();
        win?.setFullScreen(!win.isFullScreen());
      }
    });
    if (devUrl) await win.loadURL(devUrl);
    else await win.loadFile(path.join(__dirname, "../dist/index.html"));
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (!quitting) {
      event.preventDefault();
      quitting = true;
      void stop().finally(() => app.quit());
    }
  });
}
