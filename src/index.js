const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const log = require('electron-log');
const { setuplocalFileWatcher } = require("./config/config");

// Load environment variables
log.initialize();
const logPath = path.join(
  "D:\\Sync\\Log",
  'app.log'
);
log.transports.file.resolvePathFn = () => logPath;
log.transports.file.level = 'info';

let mainWindow;
let loaderWindow;
let updateWindow;

const createLoaderWindow = () => {
  loaderWindow = new BrowserWindow({
    width: 300,
    height: 200,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  loaderWindow.loadFile(path.join(__dirname, "loader.html"));

  loaderWindow.once('ready-to-show', () => {
    loaderWindow.show();
  });
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width:1280,
    height:800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('https://kiosk.shatayu.online');

  mainWindow.webContents.once('did-finish-load', () => {
    if (loaderWindow) {
      loaderWindow.close();
      mainWindow.maximize(); // Maximizes the window when opened

    }
    log.info('Main window loaded successfully.');

    // Check for updates after the main window is loaded
    autoUpdater.checkForUpdates();
  });

  setuplocalFileWatcher();
};

// Function to create an update modal
const createUpdateWindow = () => {
  updateWindow = new BrowserWindow({
    width: 400,
    height: 300,
    title: "Update Available",
    resizable: false,
    modal: false,
    parent: mainWindow,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'), // Load the preload script

    },
  });
  updateWindow.setMenu(null); // Remove default menu (File, Edit, etc.)


  updateWindow.loadFile(path.join(__dirname, "update-modal.html"));

  updateWindow.once('ready-to-show', () => {
    updateWindow.show();
  });
};

app.whenReady().then(() => {
  createLoaderWindow();
  createMainWindow();
  // createUpdateWindow()
  log.info('App is ready. Checking for updates...');
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    log.info('Update available. Showing update modal.');
    createUpdateWindow();
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let progress = progressObj.percent.toFixed(2);
    log.info(`Download progress: ${progress}%`);
    if (updateWindow) {
      updateWindow.webContents.send('download-progress', progress);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded. Enabling Quit & Relaunch button.');
    if (updateWindow) {
      updateWindow.webContents.send('update-downloaded');
    }
  });

  ipcMain.on('quit-and-install', () => {
    console.log("quiting ...");
    
    autoUpdater.quitAndInstall();
  });
});

ipcMain.handle('get-version', () => app.getVersion());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    log.info('All windows closed, quitting app...');
    app.quit();
  }
});
