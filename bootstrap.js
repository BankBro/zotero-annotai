var ZoteroAnnotAI = {
  id: null,
  version: null,
  rootURI: null,
  initialized: false,
  preferencePaneID: null,
  preferencePaneRegistration: null,

  log(message) {
    const line = `[Zotero AnnotAI] ${message}`;
    Zotero.debug(line);
  },

  loadScript(relativePath) {
    Services.scriptloader.loadSubScript(this.rootURI + relativePath);
  },

  shutdownSelectionIntegration() {
    try {
      if (typeof ZoteroAnnotAIReaderSelection !== "undefined") {
        ZoteroAnnotAIReaderSelection.shutdown();
      }
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Reader selection shutdown failed: ${error.message}`);
    }

    try {
      if (typeof ZoteroAnnotAIFloatingPanel !== "undefined") {
        ZoteroAnnotAIFloatingPanel.shutdown();
      }
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Floating panel shutdown failed: ${error.message}`);
    }
  },

  shutdownProviderIntegration() {
    try {
      if (typeof ZoteroAnnotAIRequestRunner !== "undefined") {
        ZoteroAnnotAIRequestRunner.shutdown();
      }
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Provider request runner shutdown failed: ${error.message}`);
    }

    try {
      if (typeof ZoteroAnnotAISettings !== "undefined") {
        ZoteroAnnotAISettings.shutdown();
      }
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Settings shutdown failed: ${error.message}`);
    }
  },

  initProviderIntegration() {
    this.shutdownProviderIntegration();
    this.loadScript("src/provider-errors.js");
    this.loadScript("src/settings.js");
    this.loadScript("src/openai-compatible-client.js");
    this.loadScript("src/request-runner.js");
    ZoteroAnnotAISettings.init({
      log: this.log.bind(this),
    });
    ZoteroAnnotAIRequestRunner.init({
      settings: ZoteroAnnotAISettings,
      client: ZoteroAnnotAIOpenAICompatibleClient,
      errors: ZoteroAnnotAIProviderErrors,
      log: this.log.bind(this),
    });
  },

  initSelectionIntegration() {
    this.shutdownSelectionIntegration();
    this.loadScript("src/floating-panel.js");
    this.loadScript("src/reader-selection.js");
    ZoteroAnnotAIFloatingPanel.init({
      log: this.log.bind(this),
    });
    ZoteroAnnotAIReaderSelection.init({
      pluginID: this.id,
      log: this.log.bind(this),
      floatingPanel: ZoteroAnnotAIFloatingPanel,
    });
  },

  registerPreferencePane() {
    if (!Zotero.PreferencePanes?.register) {
      this.log("Preference pane API unavailable");
      return;
    }

    const registration = Zotero.PreferencePanes.register({
      pluginID: this.id,
      src: this.rootURI + "preferences.xhtml",
      scripts: [
        this.rootURI + "src/provider-errors.js",
        this.rootURI + "src/settings.js",
        this.rootURI + "src/openai-compatible-client.js",
        this.rootURI + "src/request-runner.js",
        this.rootURI + "preferences.js",
      ],
      stylesheets: [
        this.rootURI + "preferences.css",
      ],
    });

    if (registration?.then) {
      this.preferencePaneRegistration = registration;
      registration
        .then((paneID) => {
          if (!this.initialized) {
            if (paneID && Zotero.PreferencePanes?.unregister) {
              Zotero.PreferencePanes.unregister(paneID);
            }
            return;
          }
          this.preferencePaneID = paneID;
          this.log("Preference pane registered");
        })
        .catch((error) => {
          Zotero.logError(error);
          this.log(`Preference pane registration failed: ${error.message}`);
        });
      return;
    }

    this.preferencePaneID = registration;
    this.log("Preference pane registered");
  },

  unregisterPreferencePane() {
    if (!this.preferencePaneID || !Zotero.PreferencePanes?.unregister) {
      this.preferencePaneID = null;
      return;
    }

    try {
      Zotero.PreferencePanes.unregister(this.preferencePaneID);
      this.log("Preference pane unregistered");
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Preference pane unregister failed: ${error.message}`);
    }
    this.preferencePaneID = null;
    this.preferencePaneRegistration = null;
  },

  init({ id, version, rootURI }, reason) {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.initialized = true;

    const enabled = Zotero.Prefs.get("extensions.zoteroAnnotAI.enabled");
    Zotero.Prefs.set("extensions.zoteroAnnotAI.lastLifecycleEvent", `startup:${version}`);
    this.log(`Startup ${version}; enabled=${enabled}; reason=${reason}`);

    try {
      this.initProviderIntegration();
      this.registerPreferencePane();
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Provider integration failed: ${error.message}`);
    }

    try {
      this.initSelectionIntegration();
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Reader selection listener failed: ${error.message}`);
    }
  },

  shutdown(reason) {
    this.log(`Shutdown ${this.version ?? "unknown"}; reason=${reason}`);
    this.unregisterPreferencePane();
    this.shutdownSelectionIntegration();
    this.shutdownProviderIntegration();
    Zotero.Prefs.set("extensions.zoteroAnnotAI.lastLifecycleEvent", `shutdown:${this.version ?? "unknown"}`);
    this.initialized = false;
    this.id = null;
    this.version = null;
    this.rootURI = null;
    this.preferencePaneID = null;
    this.preferencePaneRegistration = null;
  },
};

function install({ version } = {}, reason) {
  ZoteroAnnotAI.log(`Install ${version ?? "unknown"}; reason=${reason}`);
}

function startup(data, reason) {
  ZoteroAnnotAI.init(data, reason);
}

function shutdown(data, reason) {
  ZoteroAnnotAI.shutdown(reason);
}

function uninstall({ version } = {}, reason) {
  ZoteroAnnotAI.log(`Uninstall ${version ?? "unknown"}; reason=${reason}`);
}
