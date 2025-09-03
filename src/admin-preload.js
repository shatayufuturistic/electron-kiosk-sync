const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Get current sync path
  getCurrentPath: () => ipcRenderer.invoke("admin-get-current-path"),

  // Get admin password
  getAdminPassword: () => ipcRenderer.invoke("admin-get-password"),

  // Save new sync path
  savePath: (path) => ipcRenderer.invoke("admin-save-path", path),

  // Test if path exists and is accessible
  testPath: (path) => ipcRenderer.invoke("admin-test-path", path),

  // Browse for folder
  browseFolder: () => ipcRenderer.invoke("admin-browse-folder"),

  // Log path management
  getCurrentLogPath: () => ipcRenderer.invoke("admin-get-current-log-path"),
  saveLogPath: (path) => ipcRenderer.invoke("admin-save-log-path", path),
  testLogPath: (path) => ipcRenderer.invoke("admin-test-log-path", path),
  browseLogFile: () => ipcRenderer.invoke("admin-browse-log-file"),

  // Application management
  restartApp: () => ipcRenderer.send("admin-restart-app"),
  getVersion: () => ipcRenderer.invoke("get-version"),

  // Environment management
  getCurrentEnvironment: () =>
    ipcRenderer.invoke("admin-get-current-environment"),
  switchEnvironment: (environment) =>
    ipcRenderer.invoke("admin-switch-environment", environment),

  // Path detection and management
  getAvailableDrives: () => ipcRenderer.invoke("admin-get-available-drives"),
  getSmartDefaults: () => ipcRenderer.invoke("admin-get-smart-defaults"),

  // Drive status checking
  checkDriveAvailability: () =>
    ipcRenderer.invoke("admin-check-drive-availability"),

  // Device configuration APIs
  getAvailableDevices: () => ipcRenderer.invoke("admin-get-available-devices"),
  getDeviceConfiguration: () => ipcRenderer.invoke("admin-get-device-configuration"),
  saveDeviceConfiguration: (config) => ipcRenderer.invoke("admin-save-device-configuration", config),

  // Close admin window
  closeWindow: () => ipcRenderer.send("admin-close-window"),
});
