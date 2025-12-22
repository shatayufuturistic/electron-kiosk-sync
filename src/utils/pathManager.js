const fs = require("fs");
const path = require("path");
const os = require("os");
const log = require("electron-log");

/**
 * Path Manager Utility
 * Handles automatic drive detection and path management with smart fallbacks
 */

// Default folder structure
const DEFAULT_FOLDERS = {
  syncPath: "KHG\\Reports",
  logPath: "Sync\\Log",
};

// Drive priority order (Windows-specific)
const DRIVE_PRIORITY = ["D:", "E:", "F:", "C:"];

/**
 * Check if a directory exists and is accessible
 */
function directoryExists(dirPath) {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a drive exists and is accessible
 */
function driveExists(driveLetter) {
  try {
    if (process.platform !== "win32") {
      return false;
    }

    const drivePath = path.join(driveLetter, "\\");
    fs.accessSync(drivePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all available drives on Windows
 */
function getAvailableDrives() {
  const availableDrives = [];

  if (process.platform !== "win32") {
    return [{ drive: "/", available: true, type: "unix" }];
  }

  for (const drive of DRIVE_PRIORITY) {
    const isAvailable = driveExists(drive);
    availableDrives.push({
      drive: drive,
      available: isAvailable,
      type: "windows",
    });

    if (isAvailable) {
      log.info(`Drive ${drive} is available`);
    } else {
      log.warn(`Drive ${drive} is not available`);
    }
  }

  return availableDrives;
}

/**
 * Get the best available drive based on priority
 */
function getBestAvailableDrive() {
  const availableDrives = getAvailableDrives();

  // Find the first available drive in priority order
  for (const drive of DRIVE_PRIORITY) {
    const driveInfo = availableDrives.find((d) => d.drive === drive);
    if (driveInfo && driveInfo.available) {
      log.info(`Selected best available drive: ${drive}`);
      return drive;
    }
  }

  // Fallback to user documents if no preferred drives are available
  const userHome = os.homedir();
  const documentsPath = path.join(userHome, "Documents");
  log.warn(
    `No preferred drives available, falling back to user documents: ${documentsPath}`
  );
  return documentsPath;
}

/**
 * Create directory structure if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      log.info(`Created directory: ${dirPath}`);
    }

    // Test write access
    const testFile = path.join(dirPath, ".write_test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);

    return true;
  } catch (error) {
    log.error(
      `Failed to create or access directory ${dirPath}: ${error.message}`
    );
    return false;
  }
}

/**
 * Get the best available path for a specific purpose
 */
function getBestAvailablePath(customPath, pathType = "syncPath") {
  // If custom path is provided and valid, use it
  if (customPath && directoryExists(customPath)) {
    log.info(`Using custom ${pathType}: ${customPath}`);
    return customPath;
  }

  if (customPath) {
    log.warn(
      `Custom ${pathType} not accessible: ${customPath}, falling back to smart default`
    );
  }

  const bestDrive = getBestAvailableDrive();
  let defaultPath;

  if (pathType === "logPath") {
    if (bestDrive.includes(":")) {
      // Windows path
      defaultPath = path.join(
        bestDrive,
        "\\",
        DEFAULT_FOLDERS.logPath,
        "app.log"
      );
    } else {
      // Unix-like path (fallback)
      defaultPath = path.join(bestDrive, "ShatayuSync", "logs", "app.log");
    }
  } else {
    // syncPath
    if (bestDrive.includes(":")) {
      // Windows path
      defaultPath = path.join(bestDrive, "\\", DEFAULT_FOLDERS.syncPath);
    } else {
      // Unix-like path (fallback)
      defaultPath = path.join(bestDrive, "ShatayuSync", "reports");
    }
  }

  log.info(`Generated smart default ${pathType}: ${defaultPath}`);
  return defaultPath;
}

/**
 * Initialize paths with smart defaults and validation
 */
function initializePaths(store) {
  const storedSyncPath = store.get("syncPath");
  const storedLogPath = store.get("logPath");

  // Initialize sync path
  let syncPath = getBestAvailablePath(storedSyncPath, "syncPath");

  // Ensure sync directory exists
  if (!ensureDirectoryExists(syncPath)) {
    // Try fallback options
    const fallbackSyncPath = getBestAvailablePath(null, "syncPath");
    if (ensureDirectoryExists(fallbackSyncPath)) {
      syncPath = fallbackSyncPath;
      log.info(`Using fallback sync path: ${syncPath}`);
    } else {
      log.error("Failed to initialize any sync path");
      syncPath = null;
    }
  }

  // Initialize log path
  let logPath = getBestAvailablePath(storedLogPath, "logPath");

  // Ensure log directory exists
  const logDir = path.dirname(logPath);
  if (!ensureDirectoryExists(logDir)) {
    // Try fallback options
    const fallbackLogPath = getBestAvailablePath(null, "logPath");
    const fallbackLogDir = path.dirname(fallbackLogPath);
    if (ensureDirectoryExists(fallbackLogDir)) {
      logPath = fallbackLogPath;
      log.info(`Using fallback log path: ${logPath}`);
    } else {
      log.error("Failed to initialize any log path");
      logPath = null;
    }
  }

  // Update stored paths if they changed
  if (syncPath && syncPath !== storedSyncPath) {
    store.set("syncPath", syncPath);
    log.info(`Updated stored sync path: ${syncPath}`);
  }

  if (logPath && logPath !== storedLogPath) {
    store.set("logPath", logPath);
    log.info(`Updated stored log path: ${logPath}`);
  }

  return {
    syncPath,
    logPath,
    availableDrives: getAvailableDrives(),
  };
}

/**
 * Validate and test a path
 */
function validatePath(testPath, pathType = "syncPath") {
  try {
    if (pathType === "logPath") {
      // For log paths, check if directory can be created and file can be written
      const logDir = path.dirname(testPath);
      if (!ensureDirectoryExists(logDir)) {
        return { valid: false, error: "Cannot create log directory" };
      }

      // Test write access to log file
      fs.writeFileSync(testPath, "test log entry\n", { flag: "a" });
      return { valid: true };
    } else {
      // For sync paths, check if directory exists or can be created
      if (!ensureDirectoryExists(testPath)) {
        return { valid: false, error: "Cannot create or access directory" };
      }
      return { valid: true };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Get system information about available storage
 */
function getSystemStorageInfo() {
  const drives = getAvailableDrives();
  const info = {
    platform: process.platform,
    availableDrives: drives,
    recommendedPaths: {},
    userHome: os.homedir(),
  };

  // Generate recommended paths for each available drive
  drives.forEach((drive) => {
    if (drive.available && drive.drive.includes(":")) {
      info.recommendedPaths[drive.drive] = {
        syncPath: path.join(drive.drive, "\\", DEFAULT_FOLDERS.syncPath),
        logPath: path.join(
          drive.drive,
          "\\",
          DEFAULT_FOLDERS.logPath,
          "app.log"
        ),
      };
    }
  });

  return info;
}

module.exports = {
  initializePaths,
  getBestAvailablePath,
  getBestAvailableDrive,
  getAvailableDrives,
  ensureDirectoryExists,
  validatePath,
  directoryExists,
  driveExists,
  getSystemStorageInfo,
};
