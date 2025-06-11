const Store = require("electron-store");
const log = require("electron-log");

let storeInstance = null;

function getStore() {
  if (storeInstance) {
    return storeInstance;
  }

  try {
    storeInstance = new Store();
    log.info("Electron Store initialized.");
    return storeInstance;
  } catch (error) {
    log.error(`Error initializing electron-store: ${error.message}`);
    throw error;
  }
}

module.exports = getStore;
