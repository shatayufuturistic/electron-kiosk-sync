const { app } = require("electron");

const log = require("electron-log");
const Store = require("electron-store");
const store = new Store();

const isMac = process.platform === "darwin";
function switchEnvironment(environment) {
  try {
    store.set("environment", environment);
    log.info(`Switching to ${environment} environment. Restarting app...`);
    app.relaunch();
    app.quit();
  } catch (error) {
    log.error(
      `Failed to switch to ${environment} environment: ${error.message}`
    );
  }
}

// Create custom menu
const menuTemplate = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  {
    label: "File",
    submenu: [isMac ? { role: "close" } : { role: "quit" }],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
        : [{ role: "close" }]),
    ],
  },
  {
    role: "help",
    submenu: [
      {
        label: "Learn More",
        click: async () => {
          const { shell, app } = require("electron");
          await shell.openExternal("https://electronjs.org");
        },
      },
    ],
  },

  {
    label: "Tools",
    submenu: [
      {
        label: "Change Env",
        submenu: [
          {
            label: "Production",
            click: () => switchEnvironment("production"),
          },
          {
            label: "Staging",
            click: () => switchEnvironment("staging"),
          },
        ],
      },
    ],
  },
];

module.exports = { menuTemplate };
