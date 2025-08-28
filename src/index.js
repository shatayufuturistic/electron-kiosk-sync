// main.js
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  dialog,
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
const envPath = path.join(process.resourcesPath, "app/.env");
dotenv.config({ path: fs.existsSync(envPath) ? envPath : ".env" });
const store = getStore();

let mainWindow, loaderWindow, updateWindow, adminWindow;
let currentFileWatcher = null;
// Initialize logging
function initializeLogger() {
  const env = store.get("environment");
  if (!env) {
    store.set("environment", "production");
  }

  // Get log path from store first, fallback to environment variable
  const logPath = store.get("logPath") || process.env.APP_LOG_PATH;

  if (logPath) {
    try {
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      log.initialize();
      log.transports.file.resolvePathFn = () => logPath;
      log.transports.file.level = "info";
      log.info("Logger initialized successfully with custom path.");
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

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
    },
  });
  const env = store.get("environment");
  const FRONTEND_URL =
    env === "staging"
      ? process.env.STAGING_FRONTEND_URL
      : process.env.PROD_FRONTEND_URL;
  // mainWindow.setMenu(menu);
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

  adminWindow.setMenu(null);
  adminWindow.loadFile(path.join(__dirname, "admin-config.html"));

  adminWindow.once("ready-to-show", () => {
    adminWindow.show();
    adminWindow.maximize();
    adminWindow.focus();
    log.info("Admin window opened in full-screen mode");
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
    const currentPath = store.get("syncPath") || process.env.SYNC_PATH || "";
    log.info(`Admin: Current sync path requested: ${currentPath}`);
    return currentPath;
  });

  ipcMain.handle("admin-get-password", () => {
    return process.env.ADMIN_PASSWORD || "admin123";
  });

  ipcMain.handle("admin-save-path", async (event, newPath) => {
    try {
      // Validate path exists
      if (!fs.existsSync(newPath)) {
        return { success: false, error: "Path does not exist" };
      }

      // Check if path is a directory
      const stats = fs.statSync(newPath);
      if (!stats.isDirectory()) {
        return { success: false, error: "Path is not a directory" };
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
      if (!fs.existsSync(testPath)) {
        return { success: false, error: "Path does not exist" };
      }

      const stats = fs.statSync(testPath);
      if (!stats.isDirectory()) {
        return { success: false, error: "Path is not a directory" };
      }

      // Test write permissions
      const testFile = path.join(testPath, ".test_write_access");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-browse-folder", async () => {
    try {
      const result = await dialog.showOpenDialog(adminWindow, {
        properties: ["openDirectory"],
        title: "Select Sync Folder",
        defaultPath: store.get("syncPath") || process.env.SYNC_PATH || "C:\\",
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
    const currentLogPath =
      store.get("logPath") || process.env.APP_LOG_PATH || "";
    log.info(`Admin: Current log path requested: ${currentLogPath}`);
    return currentLogPath;
  });

  ipcMain.handle("admin-save-log-path", async (event, newLogPath) => {
    try {
      // Validate log path directory exists
      const logDir = path.dirname(newLogPath);
      if (!fs.existsSync(logDir)) {
        // Try to create the directory
        try {
          fs.mkdirSync(logDir, { recursive: true });
        } catch (error) {
          return {
            success: false,
            error: `Cannot create log directory: ${error.message}`,
          };
        }
      }

      // Test write permissions
      try {
        fs.writeFileSync(newLogPath, "", { flag: "a" }); // Append mode, creates if not exists
      } catch (error) {
        return {
          success: false,
          error: `Cannot write to log file: ${error.message}`,
        };
      }

      // Save to store
      store.set("logPath", newLogPath);
      log.info(`Admin: Log path updated to: ${newLogPath}`);

      return { success: true };
    } catch (error) {
      log.error(`Admin: Error saving log path: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-test-log-path", async (event, testLogPath) => {
    try {
      const logDir = path.dirname(testLogPath);

      // Check if directory exists or can be created
      if (!fs.existsSync(logDir)) {
        try {
          fs.mkdirSync(logDir, { recursive: true });
        } catch (error) {
          return {
            success: false,
            error: `Cannot create log directory: ${error.message}`,
          };
        }
      }

      // Test write permissions
      try {
        const testContent = `Test log entry - ${new Date().toISOString()}\n`;
        fs.writeFileSync(testLogPath, testContent, { flag: "a" });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: `Cannot write to log file: ${error.message}`,
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("admin-browse-log-file", async () => {
    try {
      const result = await dialog.showSaveDialog(adminWindow, {
        title: "Select Log File Location",
        defaultPath: store.get("logPath") || path.join("C:\\", "app.log"),
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
