// main.js
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  systemPreferences,
  session,
} = require("electron");

const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const log = require("electron-log");
const fs = require("fs");
const { setupLocalFileWatcher } = require("./config/config");
const dotenv = require("dotenv");
const Store = require("electron-store");
const { menuTemplate, setAdminPanelOpener } = require("./utils/menu");
const getStore = require("./utils/localstorage");
const {
  initializePaths,
  getBestAvailablePath,
  ensureDirectoryExists,
  getAvailableDrives,
  getSystemStorageInfo,
  validatePath,
} = require("./utils/pathManager");
const { default: axios } = require("axios");
const { addKioskSystemConfig, getKioskConfig } = require("./utils/configApi");
const envPath = path.join(process.resourcesPath, "app/.env");
dotenv.config({ path: fs.existsSync(envPath) ? envPath : ".env" });
const store = getStore();

let mainWindow, loaderWindow, updateWindow, adminWindow;
let currentFileWatcher = null;
// Initialize logging with smart path management
function initializeLogger() {
  const env = store.get("environment");
  if (!env) {
    store.set("environment", "production");
  }

  // Initialize paths with smart defaults
  const initializedPaths = initializePaths(store);

  // Use the initialized log path
  const logPath = initializedPaths.logPath;

  if (logPath) {
    try {
      // Ensure log directory exists
      const logDir = path.dirname(logPath);
      if (ensureDirectoryExists(logDir)) {
        log.initialize();
        log.transports.file.resolvePathFn = () => logPath;
        log.transports.file.level = "info";
        log.info(`Logger initialized successfully with path: ${logPath}`);
        log.info(
          `Available drives detected and paths configured automatically`
        );
      } else {
        log.warn(
          `Failed to create log directory, using default logging: ${logDir}`
        );
      }
    } catch (error) {
      console.error("Failed to initialize custom logger:", error);
      log.info("Using default logger due to custom path error.");
    }
  } else {
    log.info("Logger initialized with default settings.");
  }
}

function createLoaderWindow() {
  loaderWindow = new BrowserWindow({
    width: 300,
    height: 200,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
    },
  });

  loaderWindow.loadFile(path.join(__dirname, "loader.html"));
  loaderWindow.once("ready-to-show", () => loaderWindow.show());
}

// Function to switch environment and restart

const menu = Menu.buildFromTemplate(menuTemplate);
const env = store.get("environment");

function createMainWindow() {
  const preloadPath = path.join(__dirname, "preload.js");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
    },
  });
  // const FRONTEND_URL = "http://localhost:5173/";
  const FRONTEND_URL =
    env === "staging"
      ? process.env.STAGING_FRONTEND_URL
      : process.env.PROD_FRONTEND_URL;
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.webContents.once("did-finish-load", () => {
    if (loaderWindow && !loaderWindow.isDestroyed()) {
      loaderWindow.close();
    }
    mainWindow.maximize();
    mainWindow.show();
    log.info("Main window loaded successfully.");
  });

  setTimeout(() => {
    if (loaderWindow && !loaderWindow.isDestroyed()) {
      loaderWindow.close();
      log.warn("Loader window closed due to timeout.");
    }
  }, 10000);

  try {
    if (typeof setupLocalFileWatcher === "function") {
      currentFileWatcher = setupLocalFileWatcher();
      if (currentFileWatcher) {
        log.info("Local file watcher initialized.");
      } else {
        log.warn(
          "File watcher could not be initialized. Check sync path configuration."
        );
      }
    } else {
      log.warn("setupLocalFileWatcher is not a function.");
    }
  } catch (error) {
    log.error(`Error in setupLocalFileWatcher: ${error.message}`);
  }
}

function createUpdateWindow() {
  const preloadPath = path.join(__dirname, "preload.js");

  if (!fs.existsSync(preloadPath)) {
    log.error("Preload script not found:", preloadPath);
    return;
  }

  updateWindow = new BrowserWindow({
    width: 400,
    height: 300,
    title: "Update Available",
    resizable: false,
    modal: true,
    parent: mainWindow,
    show: false,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  updateWindow.setMenu(null);
  updateWindow.loadFile(path.join(__dirname, "update-modal.html"));
  updateWindow.once("ready-to-show", () => updateWindow.show());
}

function createAdminWindow() {
  const adminPreloadPath = path.join(__dirname, "admin-preload.js");

  if (!fs.existsSync(adminPreloadPath)) {
    log.error("Admin preload script not found:", adminPreloadPath);
    return;
  }

  adminWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Admin Configuration - Shatayu Sync",
    resizable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: true,
    show: false,
    center: true,
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      contextIsolation: true,
      preload: adminPreloadPath,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        callback(true); // Grant camera/mic access
      } else {
        callback(false);
      }
    }
  );
  adminWindow.setMenu(null);
  adminWindow.loadFile(path.join(__dirname, "page", "admin-config.html"));

  adminWindow.once("ready-to-show", async () => {
    adminWindow.show();
    adminWindow.maximize();
    adminWindow.focus();
    log.info("Admin window opened in full-screen mode");
    const token = store.get("authToken") || null;

    const BACKEND_URL =
      env === "staging"
        ? process.env.STAGING_BACKEND_URL
        : process.env.PROD_BACKEND_URL;
    const res = await getKioskConfig({ BACKEND_URL, token });
    console.log({ res });
  });

  adminWindow.on("closed", () => {
    adminWindow = null;
    log.info("Admin window closed");
  });

  adminWindow.on("closed", () => {
    adminWindow = null;
    log.info("Admin window closed");
  });
}

function setupAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = log;

  log.info("Checking for updates...");
  log.info(`Current version: ${app.getVersion()}`);

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info(`Update available. Version: ${info.version}`);
    createUpdateWindow();
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info(`Update not available. Current version: ${info.version}`);
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = progress.percent.toFixed(2);
    log.info(`Download progress: ${percent}%`);
    updateWindow?.webContents.send("download-progress", percent);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info(`Update downloaded. Version: ${info.version}`);
    updateWindow?.webContents.send("download-progress", "100");
    updateWindow?.webContents.send("update-downloaded");
  });

  autoUpdater.on("error", (error) => {
    log.error(`Update error: ${error.message}`);
    log.error(`Error stack: ${error.stack}`);
    updateWindow?.webContents.send("update-error", error.message);
  });
}

function registerIpcHandlers() {
  ipcMain.on("quit-and-install", () => {
    log.info("Quitting and installing update...");
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle("get-version", () => app.getVersion());

  // Admin configuration handlers
  ipcMain.handle("admin-get-current-path", () => {
    const storedPath = store.get("syncPath");
    const currentPath =
      storedPath || getBestAvailablePath(null, "syncPath") || "";
    log.info(`Admin: Current sync path requested: ${currentPath}`);
    return currentPath;
  });

  ipcMain.handle("admin-get-password", () => {
    return process.env.ADMIN_PASSWORD || "admin";
  });

  ipcMain.handle("admin-save-path", async (event, newPath) => {
    try {
      // Use path manager to validate the path
      const validation = validatePath(newPath, "syncPath");
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Save to store
      store.set("syncPath", newPath);
      log.info(`Admin: Sync path updated to: ${newPath}`);

      // Restart file watcher with new path
      await restartFileWatcher(newPath);

      return { success: true };
    } catch (error) {
      log.error(`Admin: Error saving path: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-test-path", async (event, testPath) => {
    try {
      const validation = validatePath(testPath, "syncPath");
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-browse-folder", async () => {
    try {
      const currentPath =
        store.get("syncPath") || getBestAvailablePath(null, "syncPath");
      const result = await dialog.showOpenDialog(adminWindow, {
        properties: ["openDirectory"],
        title: "Select Sync Folder",
        defaultPath: currentPath || "C:\\",
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (error) {
      log.error(`Admin: Error browsing folder: ${error.message}`);
      return null;
    }
  });

  ipcMain.on("admin-close-window", () => {
    if (adminWindow) {
      adminWindow.close();
    }
  });

  // Log path management handlers
  ipcMain.handle("admin-get-current-log-path", () => {
    const storedLogPath = store.get("logPath");
    const currentLogPath =
      storedLogPath || getBestAvailablePath(null, "logPath") || "";
    log.info(`Admin: Current log path requested: ${currentLogPath}`);
    return currentLogPath;
  });

  ipcMain.handle("admin-save-log-path", async (event, newLogPath) => {
    try {
      // Use path manager to validate the log path
      const validation = validatePath(newLogPath, "logPath");
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Save to store
      store.set("logPath", newLogPath);
      log.info(`Admin: Log path updated to: ${newLogPath}`);

      // Restart logger with new path immediately
      await restartLogger(newLogPath);

      return { success: true };
    } catch (error) {
      log.error(`Admin: Error saving log path: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-test-log-path", async (event, testLogPath) => {
    try {
      const validation = validatePath(testLogPath, "logPath");
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-browse-log-file", async () => {
    try {
      const currentLogPath =
        store.get("logPath") || getBestAvailablePath(null, "logPath");
      const result = await dialog.showSaveDialog(adminWindow, {
        title: "Select Log File Location",
        defaultPath: currentLogPath || path.join("C:\\", "app.log"),
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "Text Files", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (!result.canceled && result.filePath) {
        return result.filePath;
      }
      return null;
    } catch (error) {
      log.error(`Admin: Error browsing log file: ${error.message}`);
      return null;
    }
  });

  // Application restart handler
  ipcMain.on("admin-restart-app", () => {
    log.info("Admin: Restarting application...");
    app.relaunch();
    app.quit();
  });

  // Environment management handlers
  ipcMain.handle("admin-get-current-environment", () => {
    const currentEnv = store.get("environment") || "production";
    log.info(`Admin: Current environment requested: ${currentEnv}`);
    return currentEnv;
  });

  ipcMain.handle("admin-switch-environment", async (event, environment) => {
    try {
      if (environment !== "production" && environment !== "staging") {
        return {
          success: false,
          error: "Invalid environment. Use 'production' or 'staging'.",
        };
      }

      store.set("environment", environment);
      log.info(
        `Admin: Environment switched to ${environment}. Restarting app...`
      );

      // Restart the application
      setTimeout(() => {
        app.relaunch();
        app.quit();
      }, 1000);

      return { success: true };
    } catch (error) {
      log.error(`Admin: Error switching environment: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Path management handlers
  ipcMain.handle("admin-get-available-drives", () => {
    try {
      const drives = getAvailableDrives();
      log.info(`Admin: Available drives requested: ${JSON.stringify(drives)}`);
      return drives;
    } catch (error) {
      log.error(`Admin: Error getting available drives: ${error.message}`);
      return [];
    }
  });

  ipcMain.handle("admin-get-smart-defaults", () => {
    try {
      const systemInfo = getSystemStorageInfo();
      const defaults = {
        syncPath: getBestAvailablePath(null, "syncPath"),
        logPath: getBestAvailablePath(null, "logPath"),
        systemInfo: systemInfo,
      };
      log.info(`Admin: Smart defaults requested: ${JSON.stringify(defaults)}`);
      return defaults;
    } catch (error) {
      log.error(`Admin: Error getting smart defaults: ${error.message}`);
      return { syncPath: null, logPath: null, systemInfo: null };
    }
  });

  // Drive availability check handler
  ipcMain.handle("admin-check-drive-availability", () => {
    try {
      const drives = getAvailableDrives();
      const systemInfo = getSystemStorageInfo();
      return {
        drives: drives,
        currentSyncPath:
          store.get("syncPath") || getBestAvailablePath(null, "syncPath"),
        currentLogPath:
          store.get("logPath") || getBestAvailablePath(null, "logPath"),
        systemInfo: systemInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log.error(`Admin: Error checking drive availability: ${error.message}`);
      return { error: error.message };
    }
  });

  // Device configuration handlers - This will be handled in renderer process
  ipcMain.handle("admin-get-available-devices", async () => {
    // This handler exists for compatibility but actual device enumeration
    // should be done in the renderer process where navigator.mediaDevices is available
    return {
      message: "Device enumeration should be handled in renderer process",
      cameras: [],
      audioInputs: [],
      audioOutputs: [],
    };
  });

  ipcMain.handle("admin-get-device-configuration", async () => {
    try {
      const config = store.get("deviceConfiguration") || {
        videoCall: "",
        dermoscope: "",
        optoscope: "",
        stethoscope: "",
      };
      log.info(
        `Admin: Device configuration requested: ${JSON.stringify(config)}`
      );

      return config;
    } catch (error) {
      log.error(`Admin: Error getting device configuration: ${error.message}`);
      return null;
    }
  });

  ipcMain.handle("admin-save-device-configuration", async (event, config) => {
    try {
      // Validate the configuration structure
      if (!config || typeof config !== "object") {
        return { success: false, error: "Invalid configuration format" };
      }

      // Save to store
      store.set("deviceConfiguration", config);
      log.info(`Admin: Device configuration saved: ${JSON.stringify(config)}`);
      const token = store.get("authToken") || null;

      const BACKEND_URL =
        env === "staging"
          ? process.env.STAGING_BACKEND_URL
          : process.env.PROD_BACKEND_URL;
      const res = await addKioskSystemConfig({
        BACKEND_URL,
        body: config,
        token,
      });
      // const res = await getKioskConfig({ BACKEND_URL, token });
      console.log({ res });
      return { success: true };
    } catch (error) {
      log.error(`Admin: Error saving device configuration: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // System configuration handlers
  ipcMain.handle("admin-save-system-configuration", async (event, config) => {
    try {
      // Validate the configuration structure
      if (!config || typeof config !== "object") {
        return { success: false, error: "Invalid system configuration format" };
      }

      // Save to store
      store.set("systemConfiguration", config);

      log.info(`Admin: System configuration saved: ${JSON.stringify(config)}`);
      const token = store.get("authToken") || null;

      const BACKEND_URL =
        env === "staging"
          ? process.env.STAGING_BACKEND_URL
          : process.env.PROD_BACKEND_URL;
      const res = await addKioskSystemConfig({
        BACKEND_URL,
        body: config,
        token,
        type: "system",
      });
      console.log({ res });

      return { success: true };
    } catch (error) {
      log.error(`Admin: Error saving system configuration: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-get-system-configuration", () => {
    try {
      const config = store.get("systemConfiguration") || null;

      log.info(`Admin: System configuration requested`);
      return config;
    } catch (error) {
      log.error(`Admin: Error getting system configuration: ${error.message}`);
      return null;
    }
  });
}

app.whenReady().then(() => {
  initializeLogger();
  createLoaderWindow();
  createMainWindow();
  setupAutoUpdater();
  registerIpcHandlers();

  // Set admin panel opener for menu
  setAdminPanelOpener(() => {
    if (adminWindow) {
      adminWindow.focus();
    } else {
      createAdminWindow();
    }
  });
});

// Function to restart file watcher with new path
async function restartFileWatcher(newPath) {
  try {
    // Stop current watcher if exists
    if (currentFileWatcher) {
      currentFileWatcher.close();
      log.info("Previous file watcher stopped");
    }

    // Import the config module and restart with new path
    const { setupLocalFileWatcher } = require("./config/config");
    currentFileWatcher = setupLocalFileWatcher(newPath);
    log.info(`File watcher restarted with path: ${newPath}`);
  } catch (error) {
    log.error(`Error restarting file watcher: ${error.message}`);
    throw error;
  }
}

// Function to restart logger with new log path
async function restartLogger(newLogPath) {
  try {
    // Ensure log directory exists
    const logDir = path.dirname(newLogPath);
    if (!ensureDirectoryExists(logDir)) {
      throw new Error(`Cannot create log directory: ${logDir}`);
    }

    // Reconfigure the logger with new path
    log.transports.file.resolvePathFn = () => newLogPath;
    log.transports.file.level = "info";

    // Write a message to confirm the switch
    log.info(`Logger restarted with new path: ${newLogPath}`);
    log.info("Log path updated successfully - no restart required!");
  } catch (error) {
    log.error(`Error restarting logger: ${error.message}`);
    throw error;
  }
}

ipcMain.on("auth-token", (event, token) => {
  console.log("🔑 Token received from React:", token);
  authToken = token;

  // ✅ Optional: persist securely
  const store = new Store();
  store.set("authToken", token);
});

ipcMain.handle("get-device-config", async () => {
  const system = store.get("systemConfiguration") || null;
  const device = store.get("deviceConfiguration") || null;

  const deviceConfig = {
    device, // deviceId of camera
    system, // deviceId of microphone
  };
  return deviceConfig;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    log.info("All windows closed. Quitting app.");
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
