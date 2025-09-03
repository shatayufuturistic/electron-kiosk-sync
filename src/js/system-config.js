// System Configuration Module
class SystemConfigModule {
  constructor() {
    this.elements = {};
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Environment elements
    this.elements.currentEnvironment =
      document.getElementById("currentEnvironment");
    this.elements.switchToProduction =
      document.getElementById("switchToProduction");
    this.elements.switchToStaging = document.getElementById("switchToStaging");
    this.elements.envError = document.getElementById("envError");
    this.elements.envSuccess = document.getElementById("envSuccess");

    // Sync path elements
    this.elements.syncPathForm = document.getElementById("syncPathForm");
    this.elements.newPath = document.getElementById("newPath");
    this.elements.currentPath = document.getElementById("currentPath");
    this.elements.browsePath = document.getElementById("browsePath");
    this.elements.testSyncPath = document.getElementById("testSyncPath");
    this.elements.syncPathError = document.getElementById("syncPathError");
    this.elements.syncPathSuccess = document.getElementById("syncPathSuccess");

    // Log path elements
    this.elements.logPathForm = document.getElementById("logPathForm");
    this.elements.newLogPath = document.getElementById("newLogPath");
    this.elements.currentLogPath = document.getElementById("currentLogPath");
    this.elements.browseLogPath = document.getElementById("browseLogPath");
    this.elements.testLogPath = document.getElementById("testLogPath");
    this.elements.logPathError = document.getElementById("logPathError");
    this.elements.logPathSuccess = document.getElementById("logPathSuccess");

    // Drive management elements
    this.elements.driveStatus = document.getElementById("driveStatus");
    this.elements.refreshDrives = document.getElementById("refreshDrives");
    this.elements.useSmartPath = document.getElementById("useSmartPath");
    this.elements.showRecommendedPaths = document.getElementById(
      "showRecommendedPaths"
    );
    this.elements.recommendedPaths =
      document.getElementById("recommendedPaths");
    this.elements.pathOptions = document.getElementById("pathOptions");

    // System info elements
    this.elements.appVersion = document.getElementById("appVersion");
    this.elements.currentEnv = document.getElementById("currentEnv");

    // Action buttons
    this.elements.logoutBtn = document.getElementById("logoutBtn");
    this.elements.restartAppBtn = document.getElementById("restartAppBtn");
  }

  attachEventListeners() {
    // Environment switching
    if (this.elements.switchToProduction) {
      this.elements.switchToProduction.addEventListener("click", () => {
        this.switchEnvironment("production");
      });
    }

    if (this.elements.switchToStaging) {
      this.elements.switchToStaging.addEventListener("click", () => {
        this.switchEnvironment("staging");
      });
    }

    // Sync Path Configuration
    if (this.elements.syncPathForm) {
      this.elements.syncPathForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newPath = this.elements.newPath.value.trim();
        if (newPath) {
          this.saveSyncPath(newPath);
        } else {
          this.showError(
            this.elements.syncPathError,
            "Please enter a valid path."
          );
        }
      });
    }

    // Log Path Configuration
    if (this.elements.logPathForm) {
      this.elements.logPathForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newLogPath = this.elements.newLogPath.value.trim();
        if (newLogPath) {
          this.saveLogPath(newLogPath);
        } else {
          this.showError(
            this.elements.logPathError,
            "Please enter a valid log file path."
          );
        }
      });
    }

    // Browse sync path
    if (this.elements.browsePath) {
      this.elements.browsePath.addEventListener("click", () => {
        window.electronAPI.browseFolder().then((path) => {
          if (path) {
            this.elements.newPath.value = path;
          }
        });
      });
    }

    // Browse log path
    if (this.elements.browseLogPath) {
      this.elements.browseLogPath.addEventListener("click", () => {
        window.electronAPI.browseLogFile().then((path) => {
          if (path) {
            this.elements.newLogPath.value = path;
          }
        });
      });
    }

    // Test sync path
    if (this.elements.testSyncPath) {
      this.elements.testSyncPath.addEventListener("click", () => {
        const path = this.elements.newPath.value.trim();
        if (path) {
          window.electronAPI.testPath(path).then((result) => {
            if (result.success) {
              this.showSuccess(
                this.elements.syncPathSuccess,
                "Sync path is valid and accessible!"
              );
            } else {
              this.showError(
                this.elements.syncPathError,
                `Sync path test failed: ${result.error}`
              );
            }
          });
        } else {
          this.showError(
            this.elements.syncPathError,
            "Please enter a path to test."
          );
        }
      });
    }

    // Test log path
    if (this.elements.testLogPath) {
      this.elements.testLogPath.addEventListener("click", () => {
        const path = this.elements.newLogPath.value.trim();
        if (path) {
          window.electronAPI.testLogPath(path).then((result) => {
            if (result.success) {
              this.showSuccess(
                this.elements.logPathSuccess,
                "Log path is valid and writable!"
              );
            } else {
              this.showError(
                this.elements.logPathError,
                `Log path test failed: ${result.error}`
              );
            }
          });
        } else {
          this.showError(
            this.elements.logPathError,
            "Please enter a log path to test."
          );
        }
      });
    }

    // Drive management event listeners
    if (this.elements.refreshDrives) {
      this.elements.refreshDrives.addEventListener("click", () => {
        this.updateDriveStatus();
      });
    }

    if (this.elements.useSmartPath) {
      this.elements.useSmartPath.addEventListener("click", async () => {
        try {
          const smartDefaults = await window.electronAPI.getSmartDefaults();
          if (smartDefaults.syncPath) {
            this.elements.newPath.value = smartDefaults.syncPath;
            this.showSuccess(
              this.elements.syncPathSuccess,
              `Smart default path applied: ${smartDefaults.syncPath}`
            );
          } else {
            this.showError(
              this.elements.syncPathError,
              "No smart default path available."
            );
          }
        } catch (error) {
          this.showError(
            this.elements.syncPathError,
            `Error getting smart defaults: ${error.message}`
          );
        }
      });
    }

    if (this.elements.showRecommendedPaths) {
      this.elements.showRecommendedPaths.addEventListener("click", async () => {
        try {
          if (this.elements.recommendedPaths.classList.contains("hidden")) {
            const smartDefaults = await window.electronAPI.getSmartDefaults();
            this.updateRecommendedPaths(smartDefaults.systemInfo);
            this.elements.recommendedPaths.classList.remove("hidden");
            this.elements.showRecommendedPaths.textContent = "🔽 Hide Options";
          } else {
            this.elements.recommendedPaths.classList.add("hidden");
            this.elements.showRecommendedPaths.textContent = "💡 Show Options";
          }
        } catch (error) {
          this.showError(
            this.elements.syncPathError,
            `Error loading recommended paths: ${error.message}`
          );
        }
      });
    }

    // Action buttons
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener("click", () => {
        if (
          window.adminConfigApp &&
          typeof window.adminConfigApp.logout === "function"
        ) {
          window.adminConfigApp.logout();
        }
      });
    }

    if (this.elements.restartAppBtn) {
      this.elements.restartAppBtn.addEventListener("click", () => {
        if (
          confirm(
            "Are you sure you want to restart the application? Any unsaved work will be lost."
          )
        ) {
          window.electronAPI.restartApp();
        }
      });
    }
  }

  async loadCurrentPaths() {
    try {
      // Load sync path
      const path = await window.electronAPI.getCurrentPath();
      if (this.elements.currentPath) {
        this.elements.currentPath.textContent = path || "Not configured";
      }
      if (this.elements.newPath) {
        this.elements.newPath.value = path || "";
      }

      // Load log path
      const logPath = await window.electronAPI.getCurrentLogPath();
      if (this.elements.currentLogPath) {
        this.elements.currentLogPath.textContent = logPath || "Not configured";
      }
      if (this.elements.newLogPath) {
        this.elements.newLogPath.value = logPath || "";
      }

      // Load environment
      const env = await window.electronAPI.getCurrentEnvironment();
      if (this.elements.currentEnvironment) {
        this.elements.currentEnvironment.textContent = env || "Unknown";
      }
      if (this.elements.currentEnv) {
        this.elements.currentEnv.textContent = env || "Unknown";
      }

      // Load system information
      await this.loadSystemInfo();

      // Update drive status
      await this.updateDriveStatus();
    } catch (error) {
      console.error("Error loading current paths:", error);
    }
  }

  async loadSystemInfo() {
    try {
      if (window.electronAPI.getVersion && this.elements.appVersion) {
        const version = await window.electronAPI.getVersion();
        this.elements.appVersion.textContent = version || "Unknown";
      }
    } catch (error) {
      if (this.elements.appVersion) {
        this.elements.appVersion.textContent = "Unknown";
      }
    }
  }

  async saveSyncPath(path) {
    try {
      const result = await window.electronAPI.savePath(path);
      if (result.success) {
        this.showSuccess(
          this.elements.syncPathSuccess,
          "Sync path saved successfully! File watcher will restart."
        );
        await this.loadCurrentPaths();
        this.hideError(this.elements.syncPathError);
      } else {
        this.showError(
          this.elements.syncPathError,
          `Failed to save sync path: ${result.error}`
        );
      }
    } catch (error) {
      this.showError(
        this.elements.syncPathError,
        `Error saving sync path: ${error.message}`
      );
    }
  }

  async saveLogPath(path) {
    try {
      const result = await window.electronAPI.saveLogPath(path);
      if (result.success) {
        this.showSuccess(
          this.elements.logPathSuccess,
          "Log path saved successfully! Changes applied immediately."
        );
        await this.loadCurrentPaths();
        this.hideError(this.elements.logPathError);
      } else {
        this.showError(
          this.elements.logPathError,
          `Failed to save log path: ${result.error}`
        );
      }
    } catch (error) {
      this.showError(
        this.elements.logPathError,
        `Error saving log path: ${error.message}`
      );
    }
  }

  async switchEnvironment(environment) {
    try {
      const result = await window.electronAPI.switchEnvironment(environment);
      if (result.success) {
        this.showSuccess(
          this.elements.envSuccess,
          `Switching to ${environment} environment. App will restart...`
        );
        setTimeout(() => {
          // App will restart automatically
        }, 2000);
      } else {
        this.showError(
          this.elements.envError,
          `Failed to switch environment: ${result.error}`
        );
      }
    } catch (error) {
      this.showError(
        this.elements.envError,
        `Error switching environment: ${error.message}`
      );
    }
  }

  async updateDriveStatus() {
    try {
      if (!this.elements.driveStatus) return;

      const driveInfo = await window.electronAPI.checkDriveAvailability();

      if (driveInfo.error) {
        this.elements.driveStatus.innerHTML = `<div class="text-red-600">Error: ${driveInfo.error}</div>`;
        return;
      }

      let statusHtml = "";
      driveInfo.drives.forEach((drive) => {
        const statusIcon = drive.available ? "✅" : "❌";
        const statusText = drive.available ? "Available" : "Not Found";
        const statusClass = drive.available ? "text-green-600" : "text-red-600";

        statusHtml += `
                    <div class="flex items-center justify-between">
                        <span class="font-mono">${drive.drive}</span>
                        <span class="${statusClass}">${statusIcon} ${statusText}</span>
                    </div>
                `;
      });

      this.elements.driveStatus.innerHTML = statusHtml;

      // Update timestamp
      const timestamp = new Date(driveInfo.timestamp).toLocaleTimeString();
      this.elements.driveStatus.innerHTML += `<div class="text-gray-500 text-xs mt-1 pt-1 border-t">Last checked: ${timestamp}</div>`;
    } catch (error) {
      if (this.elements.driveStatus) {
        this.elements.driveStatus.innerHTML = `<div class="text-red-600">Error checking drives: ${error.message}</div>`;
      }
    }
  }

  updateRecommendedPaths(systemInfo) {
    if (!this.elements.pathOptions) return;

    if (!systemInfo || !systemInfo.recommendedPaths) {
      this.elements.pathOptions.innerHTML =
        '<div class="text-gray-500">No recommended paths available</div>';
      return;
    }

    let optionsHtml = "";
    Object.entries(systemInfo.recommendedPaths).forEach(([drive, paths]) => {
      const driveAvailable = systemInfo.availableDrives.find(
        (d) => d.drive === drive
      )?.available;
      const statusIcon = driveAvailable ? "✅" : "❌";
      const statusClass = driveAvailable ? "text-green-600" : "text-gray-400";

      optionsHtml += `
                <div class="${statusClass} ${
        !driveAvailable ? "opacity-50" : ""
      }">
                    <div class="font-semibold">${statusIcon} ${drive}</div>
                    <div class="ml-4 text-xs">
                        <div class="cursor-pointer hover:bg-purple-100 p-1 rounded" onclick="window.systemConfig.selectPath('${
                          paths.syncPath
                        }')">
                            📁 ${paths.syncPath}
                        </div>
                    </div>
                </div>
            `;
    });

    this.elements.pathOptions.innerHTML = optionsHtml;
  }

  selectPath(path) {
    if (this.elements.newPath) {
      this.elements.newPath.value = path;
      this.showSuccess(this.elements.syncPathSuccess, `Path selected: ${path}`);
    }
  }

  showError(element, message) {
    if (element) {
      element.textContent = message;
      element.classList.remove("hidden");
    }
  }

  hideError(element) {
    if (element) {
      element.classList.add("hidden");
    }
  }

  showSuccess(element, message) {
    if (element) {
      element.textContent = message;
      element.classList.remove("hidden");
      setTimeout(() => {
        element.classList.add("hidden");
      }, 5000);
    }
  }

  // Public method to initialize the module
  async initialize() {
    await this.loadCurrentPaths();
  }
}

// Export the module
if (typeof module !== "undefined" && module.exports) {
  module.exports = SystemConfigModule;
} else {
  window.SystemConfigModule = SystemConfigModule;
}
