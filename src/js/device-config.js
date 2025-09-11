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
    this.currentTestStream = null;
    this.currentAudioStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.animationId = null;
    this.initialized = false;
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
    this.elements.exportDeviceConfig =
      document.getElementById("exportDeviceConfig");

    // Test modal elements
    this.elements.deviceTestModal = document.getElementById("deviceTestModal");
    this.elements.testModalTitle = document.getElementById("testModalTitle");
    this.elements.closeTestModal = document.getElementById("closeTestModal");
    this.elements.closeTestModalBtn =
      document.getElementById("closeTestModalBtn");
    this.elements.testVideo = document.getElementById("testVideo");
    this.elements.videoStatus = document.getElementById("videoStatus");
    this.elements.audioCanvas = document.getElementById("audioCanvas");
    this.elements.startVideoTest = document.getElementById("startVideoTest");
    this.elements.stopVideoTest = document.getElementById("stopVideoTest");
    this.elements.startAudioTest = document.getElementById("startAudioTest");
    this.elements.stopAudioTest = document.getElementById("stopAudioTest");
    this.elements.audioLevelValue = document.getElementById("audioLevelValue");
    this.elements.testResultsContent =
      document.getElementById("testResultsContent");
  }

  async attachEventListeners() {
    // Refresh devices
    if (this.elements.refreshDevices) {
      this.elements.refreshDevices.addEventListener("click", async () => {
        this.showDeviceMessage("Refreshing devices...", "info");
        await this.loadAvailableDevices();
      });
    }

    // Test device configurations
    console.log("Setting up test button event listeners...");
    console.log("testVideoCall element:", this.elements.testVideoCall);
    console.log("testDermoscope element:", this.elements.testDermoscope);
    console.log("testOtoscope element:", this.elements.testOtoscope);
    console.log("testStethoscope element:", this.elements.testStethoscope);

    if (this.elements.testVideoCall) {
      this.elements.testVideoCall.addEventListener("click", () => {
        console.log("Video Call test button clicked");
        this.testDeviceConfiguration("videoCall");
      });
    } else {
      console.error("testVideoCall button not found!");
    }

    if (this.elements.testDermoscope) {
      this.elements.testDermoscope.addEventListener("click", () => {
        console.log("Dermoscope test button clicked");
        this.testDeviceConfiguration("dermoscope");
      });
    } else {
      console.error("testDermoscope button not found!");
    }

    if (this.elements.testOtoscope) {
      this.elements.testOtoscope.addEventListener("click", () => {
        console.log("Otoscope test button clicked");
        this.testDeviceConfiguration("otoscope");
      });
    } else {
      console.error("testOtoscope button not found!");
    }

    if (this.elements.testStethoscope) {
      this.elements.testStethoscope.addEventListener("click", () => {
        console.log("Stethoscope test button clicked");
        this.testDeviceConfiguration("stethoscope");
      });
    } else {
      console.error("testStethoscope button not found!");
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

    if (this.elements.exportDeviceConfig) {
      this.elements.exportDeviceConfig.addEventListener("click", () => {
        this.exportDeviceConfiguration();
      });
    }

    // Test modal event listeners
    if (this.elements.closeTestModal) {
      this.elements.closeTestModal.addEventListener("click", () => {
        this.closeTestModal();
      });
    }

    if (this.elements.closeTestModalBtn) {
      this.elements.closeTestModalBtn.addEventListener("click", () => {
        this.closeTestModal();
      });
    }

    if (this.elements.startVideoTest) {
      this.elements.startVideoTest.addEventListener("click", () => {
        this.startVideoTest();
      });
    }

    if (this.elements.stopVideoTest) {
      this.elements.stopVideoTest.addEventListener("click", () => {
        this.stopVideoTest();
      });
    }

    if (this.elements.startAudioTest) {
      this.elements.startAudioTest.addEventListener("click", () => {
        this.startAudioTest();
      });
    }

    if (this.elements.stopAudioTest) {
      this.elements.stopAudioTest.addEventListener("click", () => {
        this.stopAudioTest();
      });
    }

    // Close modal when clicking outside
    if (this.elements.deviceTestModal) {
      this.elements.deviceTestModal.addEventListener("click", (e) => {
        if (e.target === this.elements.deviceTestModal) {
          this.closeTestModal();
        }
      });
    }
  }

  async loadDeviceConfiguration() {
    try {
      console.log("Loading device configuration...");

      if (window.electronAPI && window.electronAPI.getDeviceConfiguration) {
        const config = await window.electronAPI.getDeviceConfiguration();
        if (config) {
          console.log("Loaded config from Electron API:", config);
          // Extract device configurations from the full config object
          this.deviceConfiguration = this.extractDeviceConfig(config);
        }
      } else {
        // Fallback: load from local storage
        const storedConfig = localStorage.getItem("deviceConfiguration");
        if (storedConfig) {
          const config = JSON.parse(storedConfig);
          console.log("Loaded config from localStorage:", config);
          // Extract device configurations from the full config object
          this.deviceConfiguration = this.extractDeviceConfig(config);
        }
      }

      // Note: Don't call populateDeviceSelections() here - it will be called after devices are loaded
      console.log("Device configuration loaded:", this.deviceConfiguration);
    } catch (error) {
      console.warn("Could not load device configuration:", error);
      // Try local storage as fallback
      try {
        const storedConfig = localStorage.getItem("deviceConfiguration");
        if (storedConfig) {
          const config = JSON.parse(storedConfig);
          console.log("Loaded config from localStorage fallback:", config);
          // Extract device configurations from the full config object
          this.deviceConfiguration = this.extractDeviceConfig(config);
        }
      } catch (fallbackError) {
        console.warn(
          "Could not load from local storage either:",
          fallbackError
        );
      }
    }
  }

  // Helper method to extract device configuration from full config object
  extractDeviceConfig(fullConfig) {
    // If it's already in the old simple format, use it directly
    if (fullConfig.videoCall && !fullConfig.availableDevices) {
      return fullConfig;
    }

    // If it's the new detailed format, extract just the device configurations
    const deviceConfig = {
      videoCall: fullConfig.videoCall || "",
      dermoscope: fullConfig.dermoscope || "",
      optoscope: fullConfig.optoscope || "",
      stethoscope: fullConfig.stethoscope || "",
    };

    // Also store the metadata for reference
    if (fullConfig.availableDevices) {
      this.savedAvailableDevices = fullConfig.availableDevices;
    }
    if (fullConfig.timestamp) {
      this.lastSavedTimestamp = fullConfig.timestamp;
    }

    console.log("Extracted device config:", deviceConfig);
    return deviceConfig;
  }

  async loadAvailableDevices() {
    try {
      console.log("Loading available devices...");

      // First request permissions to access media devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("Media permissions granted, stream:", stream);

      // Stop the stream immediately as we only needed it for permissions
      stream.getTracks().forEach((track) => track.stop());

      // Now enumerate all available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("Raw devices from enumerateDevices:", devices);

      // Categorize devices and ensure we have all properties
      this.availableDevices = {
        cameras: devices
          .filter((device) => device.kind === "videoinput")
          .map((device) => ({
            deviceId: device.deviceId,
            kind: device.kind,
            label: device.label,
            groupId: device.groupId,
          })),
        audioInputs: devices
          .filter((device) => device.kind === "audioinput")
          .map((device) => ({
            deviceId: device.deviceId,
            kind: device.kind,
            label: device.label,
            groupId: device.groupId,
          })),
        audioOutputs: devices
          .filter((device) => device.kind === "audiooutput")
          .map((device) => ({
            deviceId: device.deviceId,
            kind: device.kind,
            label: device.label,
            groupId: device.groupId,
          })),
      };

      console.log("Processed available devices:", this.availableDevices);

      this.updateDeviceDisplays();
      this.populateDeviceSelectors();

      // IMPORTANT: Apply saved selections AFTER populating selectors
      this.populateDeviceSelections();

      this.showDeviceMessage(
        `Found ${this.availableDevices.cameras.length} cameras, ${this.availableDevices.audioInputs.length} audio inputs, ${this.availableDevices.audioOutputs.length} audio outputs`,
        "success"
      );
    } catch (error) {
      console.error("Error loading devices:", error);

      if (error.name === "NotAllowedError") {
        this.showDeviceMessage(
          "Camera/microphone access denied. Please allow permissions and try again.",
          "error"
        );
      } else if (error.name === "NotFoundError") {
        this.showDeviceMessage(
          "No camera or microphone found on this device.",
          "error"
        );
      } else {
        this.showDeviceMessage(
          "Error loading devices: " + error.message,
          "error"
        );
      }
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
                            <span class="font-mono text-xs" title="${
                              camera.deviceId
                            }">${camera.label || `Camera ${index + 1}`}</span>
                            <span class="text-green-600 text-xs">📷</span>
                        </div>
                    `
          )
          .join("");
      } else {
        this.elements.cameraDevices.innerHTML =
          '<div class="text-gray-500 text-center py-2">No cameras detected</div>';
      }
    }

    // Update audio devices display
    if (this.elements.audioDevices) {
      const allAudioDevices = [
        ...(this.availableDevices.audioInputs || []).map((device) => ({
          ...device, // Spread all properties (deviceId, kind, label, groupId)
          type: "input", // Add type property
          label: device.label,
        })),
        ...(this.availableDevices.audioOutputs || []).map((device) => ({
          ...device, // Spread all properties (deviceId, kind, label, groupId)
          type: "output", // Add type property
          label: device.label,
        })),
      ];

      if (allAudioDevices.length > 0) {
        this.elements.audioDevices.innerHTML = allAudioDevices
          .map(
            (device, index) => `
                        <div class="bg-white p-1.5 rounded border border-gray-200 flex items-center justify-between">
                            <span class="font-mono text-xs" title="${
                              device.deviceId
                            }">${
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
          '<div class="text-gray-500 text-center py-2">No audio devices detected</div>';
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
    console.log(
      "Populating device selections with config:",
      this.deviceConfiguration
    );

    // Video Call Configuration
    if (this.deviceConfiguration.videoCall) {
      const videoCallConfig = this.deviceConfiguration.videoCall;
      console.log("Applying video call config:", videoCallConfig);

      if (this.elements.videoCallCamera && videoCallConfig.camera) {
        this.elements.videoCallCamera.value = videoCallConfig.camera;
        console.log("Set video call camera to:", videoCallConfig.camera);
      }
      if (this.elements.videoCallMicrophone && videoCallConfig.microphone) {
        this.elements.videoCallMicrophone.value = videoCallConfig.microphone;
        console.log(
          "Set video call microphone to:",
          videoCallConfig.microphone
        );
      }
      if (this.elements.videoCallSpeaker && videoCallConfig.speaker) {
        this.elements.videoCallSpeaker.value = videoCallConfig.speaker;
        console.log("Set video call speaker to:", videoCallConfig.speaker);
      }
    }

    // Dermoscope Configuration
    if (this.deviceConfiguration.dermoscope) {
      const dermoscopeConfig = this.deviceConfiguration.dermoscope;
      console.log("Applying dermoscope config:", dermoscopeConfig);

      if (this.elements.dermoscopeCamera && dermoscopeConfig.camera) {
        this.elements.dermoscopeCamera.value = dermoscopeConfig.camera;
        console.log("Set dermoscope camera to:", dermoscopeConfig.camera);
      }
      if (this.elements.dermoscopeAudio && dermoscopeConfig.audio) {
        this.elements.dermoscopeAudio.value = dermoscopeConfig.audio;
        console.log("Set dermoscope audio to:", dermoscopeConfig.audio);
      }
    }

    // Otoscope Configuration (note: checking for 'optoscope' in config but using 'otoscope' elements)
    if (this.deviceConfiguration.optoscope) {
      const otoscopeConfig = this.deviceConfiguration.optoscope;
      console.log("Applying otoscope config:", otoscopeConfig);

      if (this.elements.otoscopeCamera && otoscopeConfig.camera) {
        this.elements.otoscopeCamera.value = otoscopeConfig.camera;
        console.log("Set otoscope camera to:", otoscopeConfig.camera);
      }
      if (this.elements.otoscopeAudio && otoscopeConfig.audio) {
        this.elements.otoscopeAudio.value = otoscopeConfig.audio;
        console.log("Set otoscope audio to:", otoscopeConfig.audio);
      }
    }

    // Stethoscope Configuration
    if (this.deviceConfiguration.stethoscope) {
      const stethoscopeConfig = this.deviceConfiguration.stethoscope;
      console.log("Applying stethoscope config:", stethoscopeConfig);

      if (this.elements.stethoscopePrimary && stethoscopeConfig.primary) {
        this.elements.stethoscopePrimary.value = stethoscopeConfig.primary;
        console.log("Set stethoscope primary to:", stethoscopeConfig.primary);
      }
      if (this.elements.stethoscopeSecondary && stethoscopeConfig.secondary) {
        this.elements.stethoscopeSecondary.value = stethoscopeConfig.secondary;
        console.log(
          "Set stethoscope secondary to:",
          stethoscopeConfig.secondary
        );
      }
    }

    console.log("Device selections populated successfully");
  }

  async saveDeviceConfiguration() {
    // Ensure devices are loaded before saving
    if (
      !this.availableDevices ||
      !this.availableDevices.cameras ||
      this.availableDevices.cameras.length === 0
    ) {
      console.warn("No devices loaded, refreshing device list before save...");
      await this.loadAvailableDevices();
    }

    // Collect current device selections with full metadata (same format as export)
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
      // Include all metadata like in export
      availableDevices: this.availableDevices || {
        cameras: [],
        audioInputs: [],
        audioOutputs: [],
      },
      timestamp: new Date().toISOString(),
      savedAt: new Date().toLocaleString(),
      version: "1.0.0",
      lastModified: Date.now(),
    };

    try {
      console.log("Saving device configuration with full metadata:", config);
      console.log("Available devices at save time:", this.availableDevices);
      let saved = false;

      // Try to save via Electron API first
      if (window.electronAPI && window.electronAPI.saveDeviceConfiguration) {
        try {
          const result = await window.electronAPI.saveDeviceConfiguration(
            config
          );
          if (result.success) {
            saved = true;
            console.log("Device configuration saved via Electron API");
            this.showDeviceMessage(
              "Device configuration saved successfully!",
              "success"
            );
          } else {
            console.warn("Electron API save failed:", result.error);
          }
        } catch (apiError) {
          console.warn("Electron API error:", apiError);
        }
      }

      // Fallback to local storage if Electron API failed or is not available
      if (!saved) {
        localStorage.setItem("deviceConfiguration", JSON.stringify(config));
        console.log("Device configuration saved to localStorage");
        this.showDeviceMessage(
          "Device configuration saved locally!",
          "success"
        );
      }

      // Update local configuration
      this.deviceConfiguration = config;
      console.log(
        "Local device configuration updated:",
        this.deviceConfiguration
      );

      // Show detailed success message
      this.showDetailedSaveMessage(config);
    } catch (error) {
      console.error("Error saving device configuration:", error);
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
    console.log("testDeviceConfiguration called with:", deviceType);

    const deviceNames = {
      videoCall: "Video Call Setup",
      dermoscope: "Dermoscope Setup",
      otoscope: "Otoscope Setup",
      stethoscope: "Stethoscope Setup",
    };

    this.currentDeviceType = deviceType;
    console.log("Opening test modal for:", deviceNames[deviceType]);
    this.openTestModal(deviceNames[deviceType]);
  }

  async exportDeviceConfiguration() {
    try {
      this.showDeviceMessage("Exporting device configuration...", "info");

      // Collect current device configuration (same format as save)
      const deviceConfig = {
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
        availableDevices: this.availableDevices || {
          cameras: [],
          audioInputs: [],
          audioOutputs: [],
        },
        timestamp: new Date().toISOString(),
        exportedAt: new Date().toLocaleString(),
        version: "1.0.0",
        lastModified: Date.now(),
        exportType: "manual", // Distinguish from auto-save
      };

      // Create downloadable JSON file
      const configJson = JSON.stringify(deviceConfig, null, 2);
      const blob = new Blob([configJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `device-config-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showDeviceMessage(
        "Device configuration exported successfully!",
        "success"
      );
    } catch (error) {
      console.error("Error exporting device configuration:", error);
      this.showDeviceMessage(
        `Error exporting device configuration: ${error.message}`,
        "error"
      );
    }
  }

  openTestModal(deviceName) {
    console.log("openTestModal called with:", deviceName);
    console.log("Initialized:", this.initialized);

    // Re-initialize elements if they're missing
    if (!this.elements.deviceTestModal) {
      console.log("Modal element missing, re-initializing elements...");
      this.initializeElements();
    }

    // Double-check that modal exists in DOM
    const modalElement = document.getElementById("deviceTestModal");
    const titleElement = document.getElementById("testModalTitle");

    if (modalElement && titleElement) {
      // Update our element references
      this.elements.deviceTestModal = modalElement;
      this.elements.testModalTitle = titleElement;

      // Set title and show modal
      titleElement.textContent = `Testing ${deviceName}`;
      modalElement.classList.remove("hidden");
      this.resetTestModal();
      console.log("Modal opened successfully");
    } else {
      console.error("Modal elements not found in DOM!");
      console.log("Modal in DOM:", modalElement);
      console.log("Title in DOM:", titleElement);

      // Show fallback error message
      this.showDeviceMessage(
        "Test modal could not be opened. Please refresh the page and try again.",
        "error"
      );
    }
  }

  closeTestModal() {
    if (this.elements.deviceTestModal) {
      this.elements.deviceTestModal.classList.add("hidden");
      this.stopAllTests();
    }
  }

  resetTestModal() {
    // Reset video
    if (this.elements.testVideo) {
      this.elements.testVideo.srcObject = null;
    }
    if (this.elements.videoStatus) {
      this.elements.videoStatus.style.display = "flex";
      this.elements.videoStatus.querySelector("span").textContent =
        "No video signal";
    }

    // Reset audio canvas
    if (this.elements.audioCanvas) {
      const canvas = this.elements.audioCanvas;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Reset audio level
    if (this.elements.audioLevelValue) {
      this.elements.audioLevelValue.textContent = "0%";
    }

    // Reset test results
    if (this.elements.testResultsContent) {
      this.elements.testResultsContent.textContent =
        'Click "Start Video" and "Start Audio" to begin testing your devices.';
    }
  }

  async startVideoTest() {
    try {
      const deviceConfig = this.getSelectedDeviceConfig();
      const cameraId = deviceConfig.camera;

      if (!cameraId) {
        this.updateTestResults("Please select a camera device first.", "error");
        return;
      }

      const constraints = {
        video: {
          deviceId: { exact: cameraId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.elements.testVideo) {
        this.elements.testVideo.srcObject = stream;
        this.elements.videoStatus.style.display = "none";
      }

      // Store stream for cleanup
      if (this.currentTestStream) {
        this.currentTestStream.getTracks().forEach((track) => track.stop());
      }
      this.currentTestStream = stream;

      this.updateTestResults(
        "Video test started successfully. You should see the camera feed above.",
        "success"
      );
    } catch (error) {
      console.error("Video test error:", error);
      this.updateTestResults(`Video test failed: ${error.message}`, "error");
    }
  }

  stopVideoTest() {
    // Stop video stream completely
    if (this.currentTestStream) {
      this.currentTestStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Video track stopped:", track.label);
      });
      this.currentTestStream = null;
    }

    if (this.elements.testVideo) {
      this.elements.testVideo.srcObject = null;
    }
    if (this.elements.videoStatus) {
      this.elements.videoStatus.style.display = "flex";
      this.elements.videoStatus.querySelector("span").textContent =
        "Video stopped";
    }

    this.updateTestResults("Video test stopped and stream released.", "info");
  }

  async startAudioTest() {
    try {
      const deviceConfig = this.getSelectedDeviceConfig();
      const audioId =
        deviceConfig.audio || deviceConfig.microphone || deviceConfig.primary;

      if (!audioId) {
        this.updateTestResults("Please select an audio device first.", "error");
        return;
      }

      const constraints = {
        audio: {
          deviceId: { exact: audioId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set up audio context and analyser
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      this.analyser.fftSize = 2048;
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Stop any existing audio stream
      if (this.currentAudioStream) {
        this.currentAudioStream.getTracks().forEach((track) => track.stop());
      }

      // Store the new audio stream
      this.currentAudioStream = stream;

      this.startAudioVisualization(dataArray);
      this.updateTestResults(
        "Audio test started successfully. You should see the waveform visualization above.",
        "success"
      );
    } catch (error) {
      console.error("Audio test error:", error);
      this.updateTestResults(`Audio test failed: ${error.message}`, "error");
    }
  }

  startAudioVisualization(dataArray) {
    const canvas = this.elements.audioCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      if (!this.analyser) return;

      this.animationId = requestAnimationFrame(draw);

      this.analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      // Calculate average volume for level indicator
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const percentage = Math.round((average / 255) * 100);

      if (this.elements.audioLevelValue) {
        this.elements.audioLevelValue.textContent = `${percentage}%`;
      }

      // Draw frequency bars
      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const red = Math.floor((dataArray[i] / 255) * 255);
        const green = Math.floor(255 - red);
        const blue = 50;

        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      // Draw waveform line
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = canvas.width / dataArray.length;
      let x2 = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x2, y);
        } else {
          ctx.lineTo(x2, y);
        }

        x2 += sliceWidth;
      }

      ctx.stroke();
    };

    draw();
  }

  stopAudioTest() {
    // Stop audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.analyser) {
      this.analyser = null;
    }

    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Stop audio stream completely
    if (this.currentAudioStream) {
      this.currentAudioStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Audio track stopped:", track.label);
      });
      this.currentAudioStream = null;
    }

    // Clear canvas
    if (this.elements.audioCanvas) {
      const canvas = this.elements.audioCanvas;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (this.elements.audioLevelValue) {
      this.elements.audioLevelValue.textContent = "0%";
    }

    this.updateTestResults("Audio test stopped and stream released.", "info");
  }

  stopAllTests() {
    this.stopVideoTest();
    this.stopAudioTest();

    // Ensure all streams are stopped
    if (this.currentTestStream) {
      this.currentTestStream.getTracks().forEach((track) => track.stop());
      this.currentTestStream = null;
    }

    if (this.currentAudioStream) {
      this.currentAudioStream.getTracks().forEach((track) => track.stop());
      this.currentAudioStream = null;
    }

    console.log("All media streams stopped and released");
  }

  getSelectedDeviceConfig() {
    const deviceType = this.currentDeviceType;

    switch (deviceType) {
      case "videoCall":
        return {
          camera: this.elements.videoCallCamera?.value,
          microphone: this.elements.videoCallMicrophone?.value,
          speaker: this.elements.videoCallSpeaker?.value,
        };
      case "dermoscope":
        return {
          camera: this.elements.dermoscopeCamera?.value,
          audio: this.elements.dermoscopeAudio?.value,
        };
      case "otoscope":
        return {
          camera: this.elements.otoscopeCamera?.value,
          audio: this.elements.otoscopeAudio?.value,
        };
      case "stethoscope":
        return {
          primary: this.elements.stethoscopePrimary?.value,
          secondary: this.elements.stethoscopeSecondary?.value,
        };
      default:
        return {};
    }
  }

  updateTestResults(message, type = "info") {
    if (!this.elements.testResultsContent) return;

    const timestamp = new Date().toLocaleTimeString();
    const icon = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";

    this.elements.testResultsContent.innerHTML = `
      <div class="flex items-start gap-2 mb-1">
        <span>${icon}</span>
        <div>
          <span class="font-semibold">[${timestamp}]</span> ${message}
        </div>
      </div>
      ${this.elements.testResultsContent.innerHTML}
    `;
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

  showDetailedSaveMessage(config) {
    const statusEl = this.elements.deviceConfigStatus;
    if (!statusEl) return;

    // Count configured devices
    let configuredCount = 0;
    const deviceTypes = ["videoCall", "dermoscope", "optoscope", "stethoscope"];

    deviceTypes.forEach((type) => {
      const deviceConfig = config[type];
      if (deviceConfig && typeof deviceConfig === "object") {
        const hasConfig = Object.values(deviceConfig).some(
          (value) => value && value.trim() !== ""
        );
        if (hasConfig) configuredCount++;
      }
    });

    const message = `✅ Configuration saved successfully! 
📊 ${configuredCount}/${deviceTypes.length} device types configured
🕒 Saved at: ${config.savedAt}
📱 ${config.availableDevices?.cameras?.length || 0} cameras, ${
      config.availableDevices?.audioInputs?.length || 0
    } audio inputs detected`;

    statusEl.className =
      "mt-2 p-3 rounded text-xs bg-green-50 border-l-4 border-green-500 text-green-700";
    statusEl.innerHTML = message.replace(/\n/g, "<br>");
    statusEl.classList.remove("hidden");

    setTimeout(() => {
      statusEl.classList.add("hidden");
    }, 8000); // Show longer for detailed message
  }

  // Listen for device changes
  setupDeviceChangeListener() {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", async () => {
        console.log("Device change detected, refreshing device list...");
        this.showDeviceMessage(
          "Device change detected, refreshing list...",
          "info"
        );
        await this.loadAvailableDevices();
      });
    }
  }

  // Public method to initialize the module
  async initialize() {
    if (this.initialized) {
      console.log("DeviceConfigModule already initialized");
      return;
    }

    try {
      console.log("Initializing DeviceConfigModule...");

      // Initialize DOM elements first
      this.initializeElements();

      // Check if critical elements exist
      if (!this.elements.deviceTestModal) {
        console.error("Critical modal elements not found in DOM");
        return;
      }

      // Attach event listeners
      await this.attachEventListeners();

      // Load configuration first (before loading devices)
      await this.loadDeviceConfiguration();

      // Then load available devices (this will also populate selections)
      await this.loadAvailableDevices();

      // Setup device change listener
      this.setupDeviceChangeListener();

      this.initialized = true;
      console.log("DeviceConfigModule initialized successfully");
    } catch (error) {
      console.error("Error during DeviceConfigModule initialization:", error);
    }
  }
}

// Export the module
if (typeof module !== "undefined" && module.exports) {
  module.exports = DeviceConfigModule;
} else {
  window.DeviceConfigModule = DeviceConfigModule;
}

// Initialize when DOM is ready
if (typeof window !== "undefined") {
  let deviceConfigInstance = null;

  function initializeDeviceConfig() {
    if (deviceConfigInstance) return deviceConfigInstance;

    try {
      deviceConfigInstance = new DeviceConfigModule();
      deviceConfigInstance.initialize();
      console.log("DeviceConfigModule initialized successfully");
      return deviceConfigInstance;
    } catch (error) {
      console.error("Failed to initialize DeviceConfigModule:", error);
      return null;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDeviceConfig);
  } else {
    // DOM is already ready
    initializeDeviceConfig();
  }

  // Also expose the initializer globally
  window.initializeDeviceConfig = initializeDeviceConfig;
}
