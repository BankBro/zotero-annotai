var ZoteroAnnotAI = {
  id: null,
  version: null,
  rootURI: null,
  initialized: false,

  log(message) {
    const line = `[Zotero AnnotAI] ${message}`;
    Zotero.debug(line);
  },

  init({ id, version, rootURI }, reason) {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.initialized = true;

    const enabled = Zotero.Prefs.get("extensions.zoteroAnnotAI.enabled");
    Zotero.Prefs.set("extensions.zoteroAnnotAI.lastLifecycleEvent", `startup:${version}`);
    this.log(`Startup ${version}; enabled=${enabled}; reason=${reason}`);
  },

  shutdown(reason) {
    this.log(`Shutdown ${this.version ?? "unknown"}; reason=${reason}`);
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
