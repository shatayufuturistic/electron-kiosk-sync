// Device Configuration Module
class DeviceConfigModule {
  constructor() {
    this.elements = {};
    this.availableDevices = {
      cameras: [],
      audioInputs: [],
      audioOutputs: [],
    };
    this.deviceConfiguration = {
      videoCall: "",
      dermoscope: "",
      optoscope: "",
      stethoscope: "",
    };
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Device display elements
    this.elements.refreshDevices = document.getElementById("refreshDevices");
    this.elements.cameraDevices = document.getElementById("cameraDevices");
    this.elements.audioDevices = document.getElementById("audioDevices");
    this.elements.deviceConfigStatus =
      document.getElementById("deviceConfigStatus");

    // Device selection elements
    this.elements.videoCallCamera = document.getElementById("videoCallCamera");
    this.elements.videoCallMicrophone = document.getElementById(
      "videoCallMicrophone"
    );
    this.elements.videoCallSpeaker =
      document.getElementById("videoCallSpeaker");
    this.elements.dermoscopeCamera =
      document.getElementById("dermoscopeCamera");
    this.elements.dermoscopeAudio = document.getElementById("dermoscopeAudio");
    this.elements.otoscopeCamera = document.getElementById("otoscopeCamera");
    this.elements.otoscopeAudio = document.getElementById("otoscopeAudio");
    this.elements.stethoscopePrimary =
      document.getElementById("stethoscopePrimary");
    this.elements.stethoscopeSecondary = document.getElementById(
      "stethoscopeSecondary"
    );

    // Test button elements
    this.elements.testVideoCall = document.getElementById("testVideoCall");
    this.elements.testDermoscope = document.getElementById("testDermoscope");
    this.elements.testOtoscope = document.getElementById("testOtoscope");
    this.elements.testStethoscope = document.getElementById("testStethoscope");

    // Action button elements
    this.elements.saveDeviceConfig =
      document.getElementById("saveDeviceConfig");
    this.elements.resetDeviceConfig =
      document.getElementById("resetDeviceConfig");
    this.elements.testAllDevices = document.getElementById("testAllDevices");
  }

  async attachEventListeners() {
    // Refresh devices
    if (this.elements.refreshDevices) {
      this.elements.refreshDevices.addEventListener("click", async () => {
        this.loadAvailableDevices();
        console.log("REFRESHING BUTTON CLIEKED .......................... ");

        // const mediaStream = await navigator.mediaDevices.getUserMedia({
        //   video: true,
        //   audio: true,
        // });

        // console.log({ mediaStream, isData: true });
      });
    }

    // Test device configurations
    if (this.elements.testVideoCall) {
      this.elements.testVideoCall.addEventListener("click", () => {
        this.testDeviceConfiguration("videoCall");
      });
    }

    if (this.elements.testDermoscope) {
      this.elements.testDermoscope.addEventListener("click", () => {
        this.testDeviceConfiguration("dermoscope");
      });
    }

    if (this.elements.testOtoscope) {
      this.elements.testOtoscope.addEventListener("click", () => {
        this.testDeviceConfiguration("otoscope");
      });
    }

    if (this.elements.testStethoscope) {
      this.elements.testStethoscope.addEventListener("click", () => {
        this.testDeviceConfiguration("stethoscope");
      });
    }

    // Action buttons
    if (this.elements.saveDeviceConfig) {
      this.elements.saveDeviceConfig.addEventListener("click", async () => {
        await this.saveDeviceConfiguration();
      });
    }

    if (this.elements.resetDeviceConfig) {
      this.elements.resetDeviceConfig.addEventListener("click", () => {
        if (
          confirm("Are you sure you want to reset all device configurations?")
        ) {
          this.resetDeviceConfiguration();
        }
      });
    }

    if (this.elements.testAllDevices) {
      this.elements.testAllDevices.addEventListener("click", () => {
        this.testAllDeviceConfigurations();
      });
    }
  }

  async loadDeviceConfiguration() {
    try {
      if (window.electronAPI.getDeviceConfiguration) {
        const config = await window.electronAPI.getDeviceConfiguration();
        if (config) {
          this.deviceConfiguration = { ...this.deviceConfiguration, ...config };
          this.populateDeviceSelections();
        }
      }
    } catch (error) {
      console.warn("Could not load device configuration:", error);
    }
  }

  async loadAvailableDevices() {
    try {
      if (window.electronAPI.getAvailableDevices) {
        this.availableDevices = await window.electronAPI.getAvailableDevices();
        this.updateDeviceDisplays();
        this.populateDeviceSelectors();
      } else {
        // Fallback for when API is not available
        this.showDeviceMessage(
          "Device enumeration API not available. Please ensure proper permissions.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error loading devices:", error);
      this.showDeviceMessage(
        "Error loading devices: " + error.message,
        "error"
      );
    }
  }

  updateDeviceDisplays() {
    // Update camera devices display
    if (this.elements.cameraDevices) {
      if (
        this.availableDevices.cameras &&
        this.availableDevices.cameras.length > 0
      ) {
        this.elements.cameraDevices.innerHTML = this.availableDevices.cameras
          .map(
            (camera, index) => `
                        <div class="bg-white p-1.5 rounded border border-gray-200 flex items-center justify-between">
                            <span class="font-mono text-xs">${
                              camera.label || `Camera ${index + 1}`
                            }</span>
                            <span class="text-green-600 text-xs">📷</span>
                        </div>
                    `
          )
          .join("");
      } else {
        this.elements.cameraDevices.innerHTML =
          '<div class="text-gray-500">No cameras detected</div>';
      }
    }

    // Update audio devices display
    if (this.elements.audioDevices) {
      const allAudioDevices = [
        ...(this.availableDevices.audioInputs || []).map((device) => ({
          ...device,
          type: "input",
        })),
        ...(this.availableDevices.audioOutputs || []).map((device) => ({
          ...device,
          type: "output",
        })),
      ];

      if (allAudioDevices.length > 0) {
        this.elements.audioDevices.innerHTML = allAudioDevices
          .map(
            (device, index) => `
                        <div class="bg-white p-1.5 rounded border border-gray-200 flex items-center justify-between">
                            <span class="font-mono text-xs">${
                              device.label || `Audio Device ${index + 1}`
                            }</span>
                            <span class="text-blue-600 text-xs">${
                              device.type === "input" ? "🎤" : "🔊"
                            }</span>
                        </div>
                    `
          )
          .join("");
      } else {
        this.elements.audioDevices.innerHTML =
          '<div class="text-gray-500">No audio devices detected</div>';
      }
    }
  }

  populateDeviceSelectors() {
    // Populate camera selectors
    const cameraOptions = this.availableDevices.cameras
      .map(
        (camera) =>
          `<option value="${camera.deviceId}">${
            camera.label || camera.deviceId
          }</option>`
      )
      .join("");

    if (this.elements.videoCallCamera) {
      this.elements.videoCallCamera.innerHTML =
        '<option value="">Select camera...</option>' + cameraOptions;
    }
    if (this.elements.dermoscopeCamera) {
      this.elements.dermoscopeCamera.innerHTML =
        '<option value="">Select camera...</option>' + cameraOptions;
    }
    if (this.elements.otoscopeCamera) {
      this.elements.otoscopeCamera.innerHTML =
        '<option value="">Select camera...</option>' + cameraOptions;
    }

    // Populate audio input selectors
    const audioInputOptions = this.availableDevices.audioInputs
      .map(
        (audio) =>
          `<option value="${audio.deviceId}">${
            audio.label || audio.deviceId
          }</option>`
      )
      .join("");

    if (this.elements.videoCallMicrophone) {
      this.elements.videoCallMicrophone.innerHTML =
        '<option value="">Select microphone...</option>' + audioInputOptions;
    }
    if (this.elements.dermoscopeAudio) {
      this.elements.dermoscopeAudio.innerHTML =
        '<option value="">Select audio input...</option>' + audioInputOptions;
    }
    if (this.elements.otoscopeAudio) {
      this.elements.otoscopeAudio.innerHTML =
        '<option value="">Select audio input...</option>' + audioInputOptions;
    }
    if (this.elements.stethoscopePrimary) {
      this.elements.stethoscopePrimary.innerHTML =
        '<option value="">Select primary audio...</option>' + audioInputOptions;
    }
    if (this.elements.stethoscopeSecondary) {
      this.elements.stethoscopeSecondary.innerHTML =
        '<option value="">Select secondary audio...</option>' +
        audioInputOptions;
    }

    // Populate audio output selectors
    const audioOutputOptions = this.availableDevices.audioOutputs
      .map(
        (audio) =>
          `<option value="${audio.deviceId}">${
            audio.label || audio.deviceId
          }</option>`
      )
      .join("");

    if (this.elements.videoCallSpeaker) {
      this.elements.videoCallSpeaker.innerHTML =
        '<option value="">Select speaker...</option>' + audioOutputOptions;
    }
  }

  populateDeviceSelections() {
    // Populate saved configurations
    if (this.deviceConfiguration.videoCall) {
      const videoCallConfig = this.deviceConfiguration.videoCall;
      if (this.elements.videoCallCamera && videoCallConfig.camera) {
        this.elements.videoCallCamera.value = videoCallConfig.camera;
      }
      if (this.elements.videoCallMicrophone && videoCallConfig.microphone) {
        this.elements.videoCallMicrophone.value = videoCallConfig.microphone;
      }
      if (this.elements.videoCallSpeaker && videoCallConfig.speaker) {
        this.elements.videoCallSpeaker.value = videoCallConfig.speaker;
      }
    }

    if (this.deviceConfiguration.dermoscope) {
      const dermoscopeConfig = this.deviceConfiguration.dermoscope;
      if (this.elements.dermoscopeCamera && dermoscopeConfig.camera) {
        this.elements.dermoscopeCamera.value = dermoscopeConfig.camera;
      }
      if (this.elements.dermoscopeAudio && dermoscopeConfig.audio) {
        this.elements.dermoscopeAudio.value = dermoscopeConfig.audio;
      }
    }

    if (this.deviceConfiguration.optoscope) {
      const otoscopeConfig = this.deviceConfiguration.optoscope;
      if (this.elements.otoscopeCamera && otoscopeConfig.camera) {
        this.elements.otoscopeCamera.value = otoscopeConfig.camera;
      }
      if (this.elements.otoscopeAudio && otoscopeConfig.audio) {
        this.elements.otoscopeAudio.value = otoscopeConfig.audio;
      }
    }

    if (this.deviceConfiguration.stethoscope) {
      const stethoscopeConfig = this.deviceConfiguration.stethoscope;
      if (this.elements.stethoscopePrimary && stethoscopeConfig.primary) {
        this.elements.stethoscopePrimary.value = stethoscopeConfig.primary;
      }
      if (this.elements.stethoscopeSecondary && stethoscopeConfig.secondary) {
        this.elements.stethoscopeSecondary.value = stethoscopeConfig.secondary;
      }
    }
  }

  async saveDeviceConfiguration() {
    // Collect current device selections
    const config = {
      videoCall: {
        camera: this.elements.videoCallCamera?.value || "",
        microphone: this.elements.videoCallMicrophone?.value || "",
        speaker: this.elements.videoCallSpeaker?.value || "",
      },
      dermoscope: {
        camera: this.elements.dermoscopeCamera?.value || "",
        audio: this.elements.dermoscopeAudio?.value || "",
      },
      optoscope: {
        camera: this.elements.otoscopeCamera?.value || "",
        audio: this.elements.otoscopeAudio?.value || "",
      },
      stethoscope: {
        primary: this.elements.stethoscopePrimary?.value || "",
        secondary: this.elements.stethoscopeSecondary?.value || "",
      },
    };

    try {
      if (window.electronAPI.saveDeviceConfiguration) {
        const result = await window.electronAPI.saveDeviceConfiguration(config);
        if (result.success) {
          this.deviceConfiguration = config;
          this.showDeviceMessage(
            "Device configuration saved successfully!",
            "success"
          );
        } else {
          this.showDeviceMessage(
            "Failed to save device configuration: " +
              (result.error || "Unknown error"),
            "error"
          );
        }
      } else {
        // Fallback: store in local storage
        localStorage.setItem("deviceConfiguration", JSON.stringify(config));
        this.deviceConfiguration = config;
        this.showDeviceMessage(
          "Device configuration saved locally!",
          "success"
        );
      }
    } catch (error) {
      this.showDeviceMessage(
        "Error saving device configuration: " + error.message,
        "error"
      );
    }
  }

  resetDeviceConfiguration() {
    // Reset all selectors
    const selectors = [
      this.elements.videoCallCamera,
      this.elements.videoCallMicrophone,
      this.elements.videoCallSpeaker,
      this.elements.dermoscopeCamera,
      this.elements.dermoscopeAudio,
      this.elements.otoscopeCamera,
      this.elements.otoscopeAudio,
      this.elements.stethoscopePrimary,
      this.elements.stethoscopeSecondary,
    ];

    selectors.forEach((selector) => {
      if (selector) {
        selector.value = "";
      }
    });

    this.showDeviceMessage(
      "Device configuration reset. Don't forget to save!",
      "info"
    );
  }

  testDeviceConfiguration(deviceType) {
    const deviceNames = {
      videoCall: "Video Call Setup",
      dermoscope: "Dermoscope Setup",
      otoscope: "Otoscope Setup",
      stethoscope: "Stethoscope Setup",
    };

    this.showDeviceMessage(
      `Testing ${deviceNames[deviceType]}... This feature will be implemented in future versions.`,
      "info"
    );
  }

  testAllDeviceConfigurations() {
    this.showDeviceMessage(
      "Testing all device configurations... This feature will be implemented in future versions.",
      "info"
    );
  }

  showDeviceMessage(message, type = "info") {
    const statusEl = this.elements.deviceConfigStatus;
    if (!statusEl) return;

    statusEl.className = `mt-2 p-2 rounded text-xs ${
      type === "error"
        ? "bg-red-50 border-l-4 border-red-500 text-red-700"
        : type === "success"
        ? "bg-green-50 border-l-4 border-green-500 text-green-700"
        : "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
    }`;
    statusEl.textContent = message;
    statusEl.classList.remove("hidden");

    if (type === "success") {
      setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 5000);
    }
  }

  // Public method to initialize the module
  async initialize() {
    await this.loadDeviceConfiguration();
    await this.loadAvailableDevices();
  }
}

// Export the module
if (typeof module !== "undefined" && module.exports) {
  module.exports = DeviceConfigModule;
} else {
  window.DeviceConfigModule = DeviceConfigModule;
}
