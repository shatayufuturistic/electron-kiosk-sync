const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const axios = require("axios");
const dns = require("dns");
const chokidar = require("chokidar");
const log = require("electron-log");
const dotenv = require('dotenv');
const Store = require("electron-store");

// Initialize logging
const logPath = path.join(
  "D:\\Sync\\Log",
  "sync.log"
);
log.transports.file.resolvePathFn = () => logPath;
log.transports.file.level = "info"; // Log only info and above

log.info("Application started.");

// Initialize electron-store
const store = new Store();
log.info("Electron Store initialized.");

const BUCKET_NAME = "satayu-kiosks";
const folderPath = "D:\\KHG\\Reports";
const envPath = path.join(process.resourcesPath, "app/.env");
dotenv.config({ path: envPath });

// Load environment variables
dotenv.config();
console.log({ key: process.env.ACCESS_KEY_ID, secret:process.env.SECRET_ACCESS_KEY })
// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: "ap-south-1",
  httpOptions: {
    timeout: 60000,
    connectTimeout: 5000,
  },
  maxRetries: 3,
  partSize: 10 * 1024 * 1024,
});

log.info("AWS S3 client initialized.");

// Load upload queue from electron-store
let uploadQueue = store.get("uploadQueue") || [];
log.info(`Loaded upload queue: ${JSON.stringify(uploadQueue)}`);

// Utility: Add a file path to the queue (if not already present)
function addToUploadQueue(filePath) {
  if (!uploadQueue.includes(filePath)) {
    uploadQueue.push(filePath);
    store.set("uploadQueue", uploadQueue);
    log.info(`Added file to upload queue: ${filePath}`);
  }
}

// Utility: Remove a file path from the queue
function removeFromUploadQueue(filePath) {
  uploadQueue = uploadQueue.filter((fp) => fp !== filePath);
  store.set("uploadQueue", uploadQueue);
  log.info(`Removed file from upload queue: ${filePath}`);
}

// Function to check internet connectivity
function checkInternetConnection() {
  return new Promise((resolve, reject) => {
    dns.lookup("google.com", (err) => {
      if (err && err.code === "ENOTFOUND") {
        log.error("No internet connection detected.");
        reject("No internet connection");
      } else {
        log.info("Internet connection available.");
        resolve("Internet connection available");
      }
    });
  });
}

// Wait for file stability before uploading
const waitForFileToStabilize = (filePath) => {
  log.info(`Checking file stability: ${filePath}`);
  let previousSize = 0;
  let stableCounter = 0;
  const maxStableCount = 5;
  const checkInterval = 500;

  const checkFile = setInterval(() => {
    const currentSize = fs.statSync(filePath).size;
    if (currentSize === previousSize) {
      stableCounter += 1;
      if (stableCounter >= maxStableCount) {
        clearInterval(checkFile);
        log.info(`File stabilized, ready for upload: ${filePath}`);
        uploadFileToS3(filePath);
      }
    } else {
      stableCounter = 0;
    }
    previousSize = currentSize;
  }, checkInterval);
};

// Function to upload a file to S3 and notify the backend
const uploadFileToS3 = (filePath) => {
  log.info(`Uploading file to S3: ${filePath}`);
  const fileStream = fs.createReadStream(filePath);
  const params = {
    Bucket: BUCKET_NAME,
    Key: path.basename(filePath),
    Body: fileStream,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      log.error(`Error uploading file to S3: ${filePath}, Error: ${err.message}`);
      addToUploadQueue(filePath);
      return;
    }

    log.info(`File uploaded successfully to S3: ${data.Location}`);

    removeFromUploadQueue(filePath);

    const payload = {
      fileURL: `https://satayu-kiosks.s3.ap-south-1.amazonaws.com/${data.Key}`,
      key: 9090,
      testName: filePath.split("\\")[3],
    };

    log.info(`Sending file URL to backend: ${JSON.stringify(payload)}`);

    axios
      .patch("https://shatayu.online/addTestReportToPatient", payload)
      .then((response) => {
        log.info(`File URL posted successfully: ${JSON.stringify(response?.data)}`);
      })
      .catch((error) => {
        log.error(`Error posting file URL: ${JSON.stringify(error?.response?.data)}`);
      });
  });
};

// Process and retry uploads for all files in the queue
function processUploadQueue() {
  if (uploadQueue.length === 0) {
    log.info("Upload queue is empty. Nothing to process.");
    return;
  }

  log.info(`Processing upload queue: ${JSON.stringify(uploadQueue)}`);

  checkInternetConnection()
    .then(() => {
      uploadQueue.forEach(uploadFileToS3);
    })
    .catch(() => {
      log.info("Internet not available; will retry queued files later.");
    });
}

// Process upload queue every 10 seconds
setInterval(processUploadQueue, 10000);

// Set up file watcher to monitor the folder for new files
function setuplocalFileWatcher() {
  log.info(`Setting up file watcher on folder: ${folderPath}`);
  const watcher = chokidar.watch(folderPath, {
    persistent: true,
    ignoreInitial: true,
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

module.exports = {
  setuplocalFileWatcher,
};
