const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const axios = require("axios");
const chokidar = require("chokidar");
const log = require("electron-log");
const dotenv = require("dotenv");
const Store = require("electron-store");
const { app } = require("electron");
const getStore = require("../utils/localstorage");
const {
  initializePaths,
  getBestAvailablePath,
  ensureDirectoryExists,
} = require("../utils/pathManager");

// Get store instance
const store = getStore();
// Environment variables
const envPath = path.join(process.resourcesPath, "app/.env");
dotenv.config({ path: fs.existsSync(envPath) ? envPath : ".env" });

// Initialize paths with smart defaults and validation
const initializedPaths = initializePaths(store);

// Logging setup
// Use initialized log path
const logPath = initializedPaths.logPath;
const BUCKET_NAME = process.env.BUCKET_NAME;
// Use initialized sync path
const folderPath = initializedPaths.syncPath;
const API_KEY = process.env.API_KEY;

const env = store.get("environment");

const BACKEND_URL =
  env === "staging"
    ? process.env.STAGING_BACKEND_URL
    : process.env.PROD_BACKEND_URL;
log.info(JSON.stringify({ BACKEND_URL, env }));

// Initialize logging with validated log path
if (logPath) {
  const logDir = path.dirname(logPath);
  // Ensure log directory exists
  if (ensureDirectoryExists(logDir)) {
    log.transports.file.resolvePathFn = () => logPath;
    log.transports.file.level = "info";
    log.info(`Application started with log path: ${logPath}`);
  } else {
    log.warn(
      `Failed to create log directory, using default logging: ${logDir}`
    );
  }
} else {
  log.warn("No valid log path found, using default logging.");
}

// Validate AWS credentials
if (!process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
  log.error("AWS credentials are missing or invalid.");
  throw new Error("AWS credentials not configured.");
}

// Load upload queue
let uploadQueue = store.get("uploadQueue") || [];
log.info(`Loaded upload queue: ${JSON.stringify(uploadQueue)}`);
console.log("key", process.env.ACCESS_KEY_ID);
console.log("secret", process.env.SECRET_ACCESS_KEY);

// Initialize S3 client with optimized settings
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: "ap-south-1",
  httpOptions: {
    timeout: 120000, // Increased to 2 minutes for large files
    connectTimeout: 10000 // Increased connection timeout
  },
  maxRetries: 5, // Increased retries for better reliability
  retryDelayOptions: {
    base: 300 // Exponential backoff starting at 300ms
  },
  partSize: 20 * 1024 * 1024, // Increased to 20MB for faster uploads
  queueSize: 4, // Allow 4 concurrent part uploads
});
log.info("AWS S3 client initialized with optimized settings.");

// Utility functions
function addToUploadQueue(filePath) {
  if (!uploadQueue.includes(filePath)) {
    uploadQueue.push(filePath);
    store.set("uploadQueue", uploadQueue);
    log.info(`Added file to upload queue: ${filePath}`);
  }
}

function removeFromUploadQueue(filePath) {
  uploadQueue = uploadQueue.filter((fp) => fp !== filePath);
  store.set("uploadQueue", uploadQueue);
  log.info(`Removed file from upload queue: ${filePath}`);
}

// Internet connectivity check
function checkInternetConnection() {
  return new Promise((resolve, reject) => {
    axios
      .get(`https://www.google.com`, {
        timeout: 3000, // Reduced from 5s to 3s for faster failure detection
      })
      .then(() => {
        log.info("Internet connection to S3 available.");
        resolve();
      })
      .catch((err) => {
        log.error("No internet connection to S3.", err.message);
        reject("No internet connection");
      });
  });
}

// File stability check
const stabilityIntervals = new Set();
const waitForFileToStabilize = (filePath) => {
  log.info(`Checking file stability: ${filePath}`);
  let previousSize = 0;
  let stableCounter = 0;
  const maxStableCount = 3; // Reduced from 10 to 3 for faster processing
  const checkInterval = 1000; // Keep 1 second interval

  const checkFile = setInterval(() => {
    try {
      const currentSize = fs.statSync(filePath).size;
      if (currentSize === previousSize) {
        stableCounter += 1;
        if (stableCounter >= maxStableCount) {
          clearInterval(checkFile);
          stabilityIntervals.delete(checkFile);
          log.info(`File stabilized, ready for upload: ${filePath}`);
          uploadFileToS3(filePath);
        }
      } else {
        stableCounter = 0;
      }
      previousSize = currentSize;
    } catch (error) {
      log.error(
        `Error checking file stability: ${filePath}, Error: ${error.message}`
      );
      clearInterval(checkFile);
      stabilityIntervals.delete(checkFile);
    }
  }, checkInterval);
  stabilityIntervals.add(checkFile);
};

// Upload to S3 with retry mechanism
const uploadFileToS3 = async (filePath, retryCount = 0, maxRetries = 3) => {
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s

  log.info(`Uploading file to S3 (attempt ${retryCount + 1}/${maxRetries + 1}): ${filePath}`);

  try {
    // Check if file exists and is accessible
    if (!fs.existsSync(filePath)) {
      log.error(`File not found: ${filePath}`);
      removeFromUploadQueue(filePath);
      return;
    }

    // Check if file is locked or in use
    try {
      const fd = fs.openSync(filePath, 'r+');
      fs.closeSync(fd);
    } catch (lockError) {
      log.warn(`File is locked or in use: ${filePath}. Will retry.`);
      if (retryCount < maxRetries) {
        setTimeout(() => uploadFileToS3(filePath, retryCount + 1, maxRetries), retryDelay);
        return;
      }
      throw new Error(`File locked after ${maxRetries + 1} attempts`);
    }

    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    const params = {
      Bucket: BUCKET_NAME,
      Key: path.basename(filePath),
      Body: fileStream,
      ContentLength: fileSize,
    };

    // Upload with progress tracking
    const upload = s3.upload(params);

    upload.on('httpUploadProgress', (progress) => {
      const percentage = Math.round((progress.loaded / progress.total) * 100);
      if (percentage % 25 === 0) { // Log at 25%, 50%, 75%, 100%
        log.info(`Upload progress for ${path.basename(filePath)}: ${percentage}%`);
      }
    });

    const data = await upload.promise();
    log.info(`File uploaded successfully to S3: ${data.Location}`);
    removeFromUploadQueue(filePath);

    // Send to backend
    const payload = {
      fileURL: `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${data.Key}`,
      key: parseInt(API_KEY),
      testName: filePath.split("\\")[3],
    };

    log.info(`Sending file URL to backend: ${JSON.stringify(payload)}`);

    try {
      const response = await axios.patch(
        BACKEND_URL + "/addTestReportToPatient",
        payload,
        { timeout: 30000 } // 30 second timeout
      );

      log.info(`File URL posted successfully: ${JSON.stringify(response?.data)}`);

      // Delete the local file after successful upload and backend notification
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          log.info(`Local file deleted successfully: ${filePath}`);
        } else {
          log.warn(`File not found for deletion: ${filePath}`);
        }
      } catch (deleteError) {
        log.error(`Error deleting local file: ${filePath}, Error: ${deleteError.message}`);
      }
    } catch (backendError) {
      log.error(`Error posting file URL: ${JSON.stringify(backendError?.response?.data || backendError.message)}`);
      log.warn(`Local file NOT deleted due to backend error: ${filePath}`);

      // Retry backend call if it failed
      if (retryCount < maxRetries) {
        log.info(`Retrying backend notification in ${retryDelay}ms...`);
        setTimeout(() => uploadFileToS3(filePath, retryCount + 1, maxRetries), retryDelay);
      }
    }

  } catch (error) {
    log.error(`Error uploading file to S3: ${filePath}, Error: ${error.message}`);

    // Retry upload if not at max retries
    if (retryCount < maxRetries) {
      log.info(`Retrying upload in ${retryDelay}ms (attempt ${retryCount + 2}/${maxRetries + 1})...`);
      addToUploadQueue(filePath);
      setTimeout(() => uploadFileToS3(filePath, retryCount + 1, maxRetries), retryDelay);
    } else {
      log.error(`Failed to upload file after ${maxRetries + 1} attempts: ${filePath}`);
      addToUploadQueue(filePath); // Keep in queue for next processing cycle
    }
  }
};

// Process upload queue with parallel processing
async function processUploadQueue() {
  if (uploadQueue.length === 0) {
    return;
  }

  log.info(`Processing upload queue with ${uploadQueue.length} file(s)`);

  try {
    await checkInternetConnection();

    // Process up to 3 files in parallel for faster throughput
    const concurrentUploads = 3;
    const filesToProcess = [...uploadQueue]; // Create a copy to avoid modification during iteration

    for (let i = 0; i < filesToProcess.length; i += concurrentUploads) {
      const batch = filesToProcess.slice(i, i + concurrentUploads);
      await Promise.allSettled(batch.map(filePath => uploadFileToS3(filePath)));
    }
  } catch (error) {
    log.info("Internet not available; will retry queued files later.");
  }
}

// Reduced interval from 10s to 5s for faster queue processing
setInterval(processUploadQueue, 5000);

// File watcher
let watcher;
function setupLocalFileWatcher(customPath = null) {
  // Get the best available path
  let watchPath = customPath;

  // If no custom path provided, get from store or generate smart default
  if (!watchPath) {
    const storedPath = store.get("syncPath");
    watchPath = storedPath || getBestAvailablePath(null, "syncPath");
  }

  if (!watchPath) {
    log.error(
      "No valid watch path available, file watcher cannot be initialized"
    );
    return null;
  }

  log.info(`Setting up file watcher on folder: ${watchPath}`);

  // Ensure directory exists
  if (!ensureDirectoryExists(watchPath)) {
    log.error(`Failed to create or access watch directory: ${watchPath}`);
    // Try to get a fallback path
    const fallbackPath = getBestAvailablePath(null, "syncPath");
    if (fallbackPath !== watchPath && ensureDirectoryExists(fallbackPath)) {
      watchPath = fallbackPath;
      log.info(`Using fallback watch path: ${watchPath}`);
      // Update stored path with working fallback
      store.set("syncPath", watchPath);
    } else {
      log.error(
        "No valid watch path available, file watcher cannot be initialized"
      );
      return null;
    }
  }

  // Close existing watcher if it exists
  if (watcher) {
    watcher.close();
    log.info("Previous file watcher closed");
  }

  watcher = chokidar.watch(watchPath, {
    persistent: true,
    ignoreInitial: true,
    ignored: ["**/*.*", "!**/*.{png,jpg,jpeg,pdf,txt}"],
    awaitWriteFinish: {
      stabilityThreshold: 2000, // Reduced from 5s to 2s for faster detection
      pollInterval: 500 // Reduced from 1s to 500ms for more responsive checking
    },
  });

  watcher
    .on("change", (filePath) => {
      log.info(`File modified: ${filePath}`);
      waitForFileToStabilize(filePath);
    })
    .on("add", (filePath) => {
      log.info(`New file added: ${filePath}`);
      waitForFileToStabilize(filePath);
    })
    .on("error", (error) => {
      log.error(`File watcher error: ${error}`);
    });

  // Update stored path if custom path was provided and it's different
  if (customPath && customPath !== store.get("syncPath")) {
    store.set("syncPath", customPath);
    log.info(`Updated stored sync path to: ${customPath}`);
  }

  log.info(`File watcher successfully initialized on: ${watchPath}`);
  return watcher;
}

// Cleanup
app.on("before-quit", () => {
  if (watcher) {
    watcher.close();
    log.info("File watcher closed.");
  }
  stabilityIntervals.forEach(clearInterval);
  log.info("Cleared file stability intervals.");
});

module.exports = { setupLocalFileWatcher };
