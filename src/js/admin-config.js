// Main Admin Configuration Application
class AdminConfigApp {
  constructor() {
    this.ADMIN_PASSWORD = "admin"; // default fallback
    this.currentTab = "system";
    this.systemConfig = null;
    this.deviceConfig = null;
    this.elements = {};
    this.isAuthenticated = false;

    this.initializeElements();
    this.attachEventListeners();
    this.initialize();
  }

  initializeElements() {
    // Authentication elements
    this.elements.authSection = document.getElementById("authSection");
    this.elements.configSection = document.getElementById("configSection");
    this.elements.authForm = document.getElementById("authForm");
    this.elements.passwordInput = document.getElementById("password");
    this.elements.authError = document.getElementById("authError");

    // Tab navigation elements
    this.elements.systemConfigTab = document.getElementById("systemConfigTab");
    this.elements.deviceConfigTab = document.getElementById("deviceConfigTab");
    this.elements.systemConfigContent = document.getElementById(
      "systemConfigContent"
    );
    this.elements.deviceConfigContent = document.getElementById(
      "deviceConfigContent"
    );

    // Tab content containers
    this.elements.tabContentContainer =
      document.getElementById("tabContentContainer") ||
      document.querySelector(".config-section") ||
      document.getElementById("configSection");
  }

  attachEventListeners() {
    // Authentication
    if (this.elements.authForm) {
      this.elements.authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAuthentication();
      });
    }

    // Tab navigation
    if (this.elements.systemConfigTab) {
      this.elements.systemConfigTab.addEventListener("click", () => {
        this.switchTab("system");
      });
    }

    if (this.elements.deviceConfigTab) {
      this.elements.deviceConfigTab.addEventListener("click", () => {
        this.switchTab("device");
      });
    }
  }

  async initialize() {
    try {
      // Load admin password from backend
      this.ADMIN_PASSWORD = await window.electronAPI.getAdminPassword();
    } catch (error) {
      console.warn("Could not load admin password from backend, using default");
    }
  }

  handleAuthentication() {
    const password = this.elements.passwordInput.value;

    if (password === this.ADMIN_PASSWORD) {
      this.showConfigSection();
    } else {
      this.showError(
        this.elements.authError,
        "Invalid password. Please try again."
      );
    }
  }

  showAuthSection() {
    if (this.elements.authSection) {
      this.elements.authSection.classList.remove("hidden");
    }
    if (this.elements.configSection) {
      this.elements.configSection.classList.add("hidden");
    }
    this.hideError(this.elements.authError);
    this.isAuthenticated = false;
  }

  async showConfigSection() {
    if (this.elements.authSection) {
      this.elements.authSection.classList.add("hidden");
    }
    if (this.elements.configSection) {
      this.elements.configSection.classList.remove("hidden");
    }
    this.hideError(this.elements.authError);
    this.isAuthenticated = true;

    // Load the default tab (system)
    await this.switchTab("system");
  }

  async switchTab(tabName) {
    // Clean up previous tab
    this.cleanupCurrentTab();

    this.currentTab = tabName;

    if (tabName === "system") {
      await this.loadSystemConfigTab();
      this.updateTabStyles("system");
    } else if (tabName === "device") {
      await this.loadDeviceConfigTab();
      this.updateTabStyles("device");
    }
  }

  cleanupCurrentTab() {
    // Clean up device config modal if it exists
    const existingModal = document.getElementById("deviceTestModal");
    if (existingModal && existingModal.parentNode === document.body) {
      document.body.removeChild(existingModal);
    }

    // Clean up any active streams or contexts
    if (this.deviceConfig) {
      if (typeof this.deviceConfig.stopAllTests === "function") {
        this.deviceConfig.stopAllTests();
      }
    }
  }

  updateTabStyles(activeTab) {
    if (activeTab === "system") {
      // Update system tab to active
      if (this.elements.systemConfigTab) {
        this.elements.systemConfigTab.classList.add(
          "text-primary",
          "border-primary",
          "bg-blue-50"
        );
        this.elements.systemConfigTab.classList.remove(
          "text-gray-600",
          "border-transparent"
        );
      }
      // Update device tab to inactive
      if (this.elements.deviceConfigTab) {
        this.elements.deviceConfigTab.classList.add(
          "text-gray-600",
          "border-transparent"
        );
        this.elements.deviceConfigTab.classList.remove(
          "text-primary",
          "border-primary",
          "bg-blue-50"
        );
      }
    } else if (activeTab === "device") {
      // Update device tab to active
      if (this.elements.deviceConfigTab) {
        this.elements.deviceConfigTab.classList.add(
          "text-primary",
          "border-primary",
          "bg-blue-50"
        );
        this.elements.deviceConfigTab.classList.remove(
          "text-gray-600",
          "border-transparent"
        );
      }
      // Update system tab to inactive
      if (this.elements.systemConfigTab) {
        this.elements.systemConfigTab.classList.add(
          "text-gray-600",
          "border-transparent"
        );
        this.elements.systemConfigTab.classList.remove(
          "text-primary",
          "border-primary",
          "bg-blue-50"
        );
      }
    }
  }

  async loadSystemConfigTab() {
    try {
      const response = await fetch("./system-config.html");
      const html = await response.text();

      // Extract the content from the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const content = doc.getElementById("systemConfigContent");

      if (content && this.elements.tabContentContainer) {
        // Clear current content and load new content
        this.elements.tabContentContainer.innerHTML = content.innerHTML;

        // Initialize system config module
        if (window.SystemConfigModule) {
          this.systemConfig = new window.SystemConfigModule();
          await this.systemConfig.initialize();

          // Make it globally accessible for path selection
          window.systemConfig = this.systemConfig;
        }
      }
    } catch (error) {
      console.error("Error loading system config tab:", error);
      this.showFallbackSystemConfig();
    }
  }

  async loadDeviceConfigTab() {
    try {
      const response = await fetch("./device-config.html");
      const html = await response.text();

      // Extract the content from the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const content = doc.getElementById("deviceConfigContent");
      const modal = doc.getElementById("deviceTestModal");

      if (content && this.elements.tabContentContainer) {
        // Clear current content and load new content
        this.elements.tabContentContainer.innerHTML = content.innerHTML;

        // Append modal to body if it exists and isn't already there
        if (modal && !document.getElementById("deviceTestModal")) {
          document.body.appendChild(modal);
        }

        // Initialize device config module with a small delay to ensure DOM is ready
        if (window.DeviceConfigModule) {
          // Wait for next tick to ensure DOM elements are rendered
          setTimeout(async () => {
            this.deviceConfig = new window.DeviceConfigModule();
            await this.deviceConfig.initialize();

            // Make it globally accessible
            window.deviceConfig = this.deviceConfig;
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error loading device config tab:", error);
      this.showFallbackDeviceConfig();
    }
  }

  showFallbackSystemConfig() {
    if (this.elements.tabContentContainer) {
      this.elements.tabContentContainer.innerHTML = `
                <div class="text-center p-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">System Configuration</h3>
                    <p class="text-gray-600">Unable to load system configuration content.</p>
                    <p class="text-xs text-gray-500 mt-2">Please check your network connection and try again.</p>
                </div>
            `;
    }
  }

  showFallbackDeviceConfig() {
    if (this.elements.tabContentContainer) {
      this.elements.tabContentContainer.innerHTML = `
                <div class="text-center p-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Device Configuration</h3>
                    <p class="text-gray-600">Unable to load device configuration content.</p>
                    <p class="text-xs text-gray-500 mt-2">Please check your network connection and try again.</p>
                </div>
            `;
    }
  }

  logout() {
    // Clean up current tab
    this.cleanupCurrentTab();

    // Reset form inputs
    if (this.elements.passwordInput) {
      this.elements.passwordInput.value = "";
    }

    // Clear tab content
    if (this.elements.tabContentContainer) {
      this.elements.tabContentContainer.innerHTML = "";
    }

    // Reset modules
    this.systemConfig = null;
    this.deviceConfig = null;

    // Show auth section
    this.showAuthSection();
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
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Make AdminConfigApp globally accessible
  window.AdminConfigApp = AdminConfigApp;

  // Initialize the main application
  window.adminConfigApp = new AdminConfigApp();
});
