const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  onDownloadProgress: (callback) =>
    ipcRenderer.on("download-progress", (event, progress) =>
      callback(progress)
    ),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on("update-downloaded", callback),
  quitAndInstall: () => ipcRenderer.send("quit-and-install"),

  sendAuthToken: (token) => ipcRenderer.send("auth-token", token),

  getDeviceConfig: () => ipcRenderer.invoke("get-device-config"),
});
