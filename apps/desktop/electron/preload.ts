import { contextBridge, ipcRenderer } from "electron";
import type { Bridge } from "../../../packages/shared/protocol";
const bridge: Bridge = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  getNetwork: () => ipcRenderer.invoke("network:get"),
  discover: () => ipcRenderer.invoke("network:discover"),
  getTeacherToken: () => ipcRenderer.invoke("teacher:token"),
  fullscreen: () => ipcRenderer.invoke("window:fullscreen"),
  getAppInfo: () => ipcRenderer.invoke("app:info"),
};
contextBridge.exposeInMainWorld("classroom", bridge);
