var ZoteroAnnotAI = {
  id: null,
  version: null,
  rootURI: null,
  initialized: false,

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
  },

  initSelectionIntegration() {
    this.shutdownSelectionIntegration();
    this.loadScript("src/reader-selection.js");
    ZoteroAnnotAIReaderSelection.init({
      pluginID: this.id,
      log: this.log.bind(this),
    });
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
      this.initSelectionIntegration();
    }
    catch (error) {
      Zotero.logError(error);
      this.log(`Reader selection listener failed: ${error.message}`);
    }
  },

  shutdown(reason) {
    this.log(`Shutdown ${this.version ?? "unknown"}; reason=${reason}`);
    this.shutdownSelectionIntegration();
    Zotero.Prefs.set("extensions.zoteroAnnotAI.lastLifecycleEvent", `shutdown:${this.version ?? "unknown"}`);
    this.initialized = false;
    this.id = null;
    this.version = null;
    this.rootURI = null;
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
