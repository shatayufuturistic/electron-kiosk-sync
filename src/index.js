// main.js
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const log = require("electron-log");
const fs = require("fs");
const { setupLocalFileWatcher } = require("./config/config");
const dotenv = require("dotenv");
const Store = require("electron-store");
const { menuTemplate } = require("./utils/menu");
const getStore = require("./utils/localstorage");
const envPath = path.join(process.resourcesPath, "app/.env");
dotenv.config({ path: fs.existsSync(envPath) ? envPath : ".env" });
const store = getStore();

let mainWindow, loaderWindow, updateWindow;
// Initialize logging
function initializeLogger() {
  const env = store.get("environment");
  if (!env) {
    store.set("environment", "production");
  }
  const logPath = process.env.APP_LOG_PATH;
  try {
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    log.initialize();
    log.transports.file.resolvePathFn = () => logPath;
    log.transports.file.level = "info";
    log.info("Logger initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize logger:", error);
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
  console.log({ env, FRONTEND_URL });
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
      setupLocalFileWatcher();
      log.info("Local file watcher initialized.");
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

function setupAutoUpdater() {
  log.info("Checking for updates...");
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("update-available", () => {
    log.info("Update available.");
    createUpdateWindow();
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = progress.percent.toFixed(2);
    log.info(`Download progress: ${percent}%`);
    updateWindow?.webContents.send("download-progress", percent);
  });

  autoUpdater.on("update-downloaded", () => {
    log.info("Update downloaded.");
    updateWindow?.webContents.send("update-downloaded");
  });

  autoUpdater.on("error", (error) => {
    log.error(`Update error: ${error.message}`);
    updateWindow?.webContents.send("update-error", error.message);
  });
}

function registerIpcHandlers() {
  ipcMain.on("quit-and-install", () => {
    log.info("Quitting and installing update...");
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle("get-version", () => app.getVersion());
}

app.whenReady().then(() => {
  initializeLogger();
  createLoaderWindow();
  createMainWindow();
  setupAutoUpdater();
  registerIpcHandlers();
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
