import {
  defaults,
  settingsSchema,
  type Bridge,
} from "../../../../packages/shared/protocol";
import { version } from "../../../../package.json";
// Browser preview supports UI only. LAN discovery and Teacher authentication require Electron.
export const desktop = !!window.classroom;
export const bridge: Bridge = window.classroom ?? {
  getSettings: async () => {
    try {
      return settingsSchema.parse(
        JSON.parse(localStorage.getItem("classroom-settings") ?? "{}"),
      );
    } catch {
      return defaults;
    }
  },
  saveSettings: async (settings) => {
    localStorage.setItem("classroom-settings", JSON.stringify(settings));
    return settings;
  },
  getNetwork: async () => ({
    addresses: [],
    serverRunning: false,
    port: 45700,
  }),
  discover: async () => [],
  getTeacherToken: async () => "",
  fullscreen: async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  },
  getAppInfo: async () => ({ version, build: "preview" }),
};
