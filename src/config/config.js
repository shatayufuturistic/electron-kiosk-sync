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

// Get store instance
const store = getStore();
// Environment variables
const envPath = path.join(process.resourcesPath, "app/.env");
dotenv.config({ path: fs.existsSync(envPath) ? envPath : ".env" });

// Logging setup
const logPath = process.env.LOG_PATH;
const BUCKET_NAME = process.env.BUCKET_NAME;
const folderPath = process.env.SYNC_PATH;
const API_KEY = process.env.API_KEY;

const env = store.get("environment");

const BACKEND_URL =
  env === "staging"
    ? process.env.STAGING_BACKEND_URL
    : process.env.PROD_BACKEND_URL;
log.info(JSON.stringify({BACKEND_URL,env}))
console.log({ BACKEND_URL, env, API_KEY });
const logDir = path.dirname(logPath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
log.transports.file.resolvePathFn = () => logPath;
log.transports.file.level = "info";
log.info("Application started.");

// Validate AWS credentials
if (!process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
  log.error("AWS credentials are missing or invalid.");
  throw new Error("AWS credentials not configured.");
}

// Load upload queue
let uploadQueue = store.get("uploadQueue") || [];
log.info(`Loaded upload queue: ${JSON.stringify(uploadQueue)}`);

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: "ap-south-1",
  httpOptions: { timeout: 60000, connectTimeout: 5000 },
  maxRetries: 3,
  partSize: 10 * 1024 * 1024,
});
log.info("AWS S3 client initialized.");

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
      .get(`https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com`, {
        timeout: 5000,
      })
      .then(() => {
        log.info("Internet connection to S3 available.");
        resolve();
      })
      .catch(() => {
        log.error("No internet connection to S3.");
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
  const maxStableCount = 10;
  const checkInterval = 1000;

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

// Upload to S3
const uploadFileToS3 = (filePath, callback = () => {}) => {
  log.info(`Uploading file to S3: ${filePath}`);
  let fileStream;
  try {
    fileStream = fs.createReadStream(filePath);
  } catch (error) {
    log.error(`Error reading file: ${filePath}, Error: ${error.message}`);
    callback();
    return;
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: path.basename(filePath),
    Body: fileStream,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      log.error(
        `Error uploading file to S3: ${filePath}, Error: ${err.message}`
      );
      addToUploadQueue(filePath);
      callback();
      return;
    }

    log.info(`File uploaded successfully to S3: ${data.Location}`);
    removeFromUploadQueue(filePath);

    const payload = {
      fileURL: `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${data.Key}`,
      key: parseInt(API_KEY),
      testName: filePath.split('\\')[3] 
     };

    log.info(`Sending file URL to backend: ${JSON.stringify(payload)}`);

    axios
      .patch(BACKEND_URL + "/addTestReportToPatient", payload)
      .then((response) => {
        log.info(
          `File URL posted successfully: ${JSON.stringify(response?.data)}`
        );
      })
      .catch((error) => {
        log.error(
          `Error posting file URL: ${JSON.stringify(error?.response?.data)}`
        );
      });

    callback();
  });
};

// Process upload queue
async function processUploadQueue() {
  if (uploadQueue.length === 0) {
    //log.info("Upload queue is empty. Nothing to process.");
    return;
  }

  log.info(`Processing upload queue: ${JSON.stringify(uploadQueue)}`);

  try {
    await checkInternetConnection();
    for (const filePath of uploadQueue) {
      await new Promise((resolve) => uploadFileToS3(filePath, resolve));
    }
  } catch {
    log.info("Internet not available; will retry queued files later.");
  }
}

setInterval(processUploadQueue, 10000);

// File watcher
let watcher;
function setupLocalFileWatcher() {
  log.info(`Setting up file watcher on folder: ${folderPath}`);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    log.info(`Created reports directory: ${folderPath}`);
  }

  watcher = chokidar.watch(folderPath, {
    persistent: true,
    ignoreInitial: true,
    ignored: ["**/*.*", "!**/*.{png,jpg,jpeg,pdf,txt}"],
    awaitWriteFinish: { stabilityThreshold: 5000, pollInterval: 1000 },
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
